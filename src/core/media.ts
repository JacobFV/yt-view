import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";

import { cosineSimilarity } from "./math";
import type { CandidateFrame } from "./types";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static") as string | null;
const ffprobeStatic = require("ffprobe-static") as { path: string };
const ffprobePath = ffprobeStatic.path;

function runBinary(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${path.basename(command)} failed with code ${code}: ${stderr}`));
    });
  });
}

export async function getDurationSeconds(videoPath: string): Promise<number> {
  const output = await runBinary(ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath
  ]);
  return Number.parseFloat(output.trim());
}

export async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");
  await mkdir(path.dirname(audioPath), { recursive: true });
  await runBinary(ffmpegPath, [
    "-y",
    "-i",
    videoPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "48k",
    audioPath
  ]);
}

export async function splitAudio(audioPath: string, chunkDir: string, chunkSeconds: number): Promise<string[]> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");
  await mkdir(chunkDir, { recursive: true });
  const chunkPattern = path.join(chunkDir, "chunk-%03d.mp3");
  await runBinary(ffmpegPath, [
    "-y",
    "-i",
    audioPath,
    "-f",
    "segment",
    "-segment_time",
    String(chunkSeconds),
    "-c",
    "copy",
    chunkPattern
  ]);

  const chunks: string[] = [];
  for (let index = 0; ; index += 1) {
    const chunkPath = path.join(chunkDir, `chunk-${index.toString().padStart(3, "0")}.mp3`);
    try {
      const chunkStat = await stat(chunkPath);
      if (chunkStat.size > 0) chunks.push(chunkPath);
    } catch {
      break;
    }
  }
  return chunks;
}

export async function extractFrame(
  videoPath: string,
  outputPath: string,
  timestamp: number,
  width: number
): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await runBinary(ffmpegPath, [
    "-y",
    "-ss",
    timestamp.toFixed(3),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${width}:-1`,
    "-q:v",
    "2",
    outputPath
  ]);
}

export function candidateTimestamps(
  durationSeconds: number,
  intervalSeconds: number,
  maxCandidateFrames: number
): number[] {
  const duration = Math.max(1, durationSeconds);
  const effectiveInterval = Math.max(intervalSeconds, duration / maxCandidateFrames);
  const timestamps: number[] = [];
  for (let time = Math.min(1, duration / 2); time < duration - 0.5; time += effectiveInterval) {
    timestamps.push(Number(time.toFixed(3)));
  }
  if (timestamps.length === 0) timestamps.push(Math.max(0, duration / 2));
  return timestamps.slice(0, maxCandidateFrames);
}

export async function analyzeImageMetrics(imagePath: string): Promise<{
  visualVector: number[];
  brightness: number;
  colorfulness: number;
}> {
  const { data, info } = await sharp(imagePath)
    .resize(16, 16, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const visualVector: number[] = [];
  let brightnessSum = 0;
  let colorfulnessSum = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const r = data[offset] / 255;
    const g = data[offset + 1] / 255;
    const b = data[offset + 2] / 255;
    const brightness = (r + g + b) / 3;
    brightnessSum += brightness;
    colorfulnessSum += Math.max(r, g, b) - Math.min(r, g, b);
    visualVector.push(r, g, b);
  }

  const pixelCount = data.length / info.channels;
  return {
    visualVector,
    brightness: brightnessSum / pixelCount,
    colorfulness: colorfulnessSum / pixelCount
  };
}

export async function extractCandidateFrames(params: {
  videoPath: string;
  frameDir: string;
  durationSeconds: number;
  intervalSeconds: number;
  maxCandidateFrames: number;
  width: number;
}): Promise<CandidateFrame[]> {
  const timestamps = candidateTimestamps(
    params.durationSeconds,
    params.intervalSeconds,
    params.maxCandidateFrames
  );

  const candidates: CandidateFrame[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const timestamp = timestamps[index];
    const fileName = `candidate-${index.toString().padStart(4, "0")}.jpg`;
    const framePath = path.join(params.frameDir, fileName);
    await extractFrame(params.videoPath, framePath, timestamp, params.width);
    const metrics = await analyzeImageMetrics(framePath);
    candidates.push({
      index,
      timestamp,
      path: framePath,
      fileName,
      visualVector: metrics.visualVector,
      visualNovelty: 0,
      brightness: metrics.brightness,
      colorfulness: metrics.colorfulness
    });
  }

  return candidates.map((candidate, index) => {
    const prev = candidates[index - 1];
    const next = candidates[index + 1];
    const diffs = [prev, next]
      .filter(Boolean)
      .map((neighbor) => 1 - cosineSimilarity(candidate.visualVector, neighbor.visualVector));
    return {
      ...candidate,
      visualNovelty: diffs.length ? diffs.reduce((sum, value) => sum + value, 0) / diffs.length : 0.5
    };
  });
}
