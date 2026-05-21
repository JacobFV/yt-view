import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import OpenAI from "openai";

import { cosineSimilarity, normalize } from "./math";
import type { CandidateFrame, FrameAnalysis, TranscriptSegment } from "./types";

type VisionJson = {
  description?: string;
  labels?: string[];
  salience?: number;
};

function parseJsonObject(text: string): VisionJson {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as VisionJson;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return { description: trimmed, labels: [], salience: 0.5 };
    try {
      return JSON.parse(match[0]) as VisionJson;
    } catch {
      return { description: trimmed, labels: [], salience: 0.5 };
    }
  }
}

export function createOpenAiClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export async function transcribeAudioChunks(params: {
  client: OpenAI;
  chunks: string[];
  chunkSeconds: number;
  model: string;
}): Promise<{ text: string; segments: TranscriptSegment[] }> {
  const segments: TranscriptSegment[] = [];

  for (let index = 0; index < params.chunks.length; index += 1) {
    const chunkPath = params.chunks[index];
    const offset = index * params.chunkSeconds;
    const response = (await params.client.audio.transcriptions.create({
      file: createReadStream(chunkPath),
      model: params.model,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    } as never)) as {
      text?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    if (response.segments?.length) {
      for (const segment of response.segments) {
        segments.push({
          start: offset + segment.start,
          end: offset + segment.end,
          text: segment.text.trim()
        });
      }
    } else if (response.text) {
      segments.push({
        start: offset,
        end: offset + params.chunkSeconds,
        text: response.text.trim()
      });
    }
  }

  return {
    text: segments.map((segment) => segment.text).join(" ").trim(),
    segments
  };
}

async function describeFrame(params: {
  client: OpenAI;
  model: string;
  frame: CandidateFrame;
  transcriptContext: string;
}): Promise<{ description: string; labels: string[]; visualSalience: number }> {
  const imageBuffer = await readFile(params.frame.path);
  const imageUrl = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

  const response = await params.client.responses.create({
    model: params.model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Analyze this video frame for a VLM that cannot watch the video. " +
              "Return strict JSON with keys description, labels, salience. " +
              "description should be one concise sentence that names visible subjects, setting, screen text, actions, and composition. " +
              "labels should be 3-8 short semantic tags. salience is a number 0-1 for how representative or information-rich this frame is. " +
              `Nearby transcript context: ${params.transcriptContext || "(none)"}`
          },
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "low"
          }
        ]
      }
    ]
  });

  const parsed = parseJsonObject(response.output_text || "");
  return {
    description: parsed.description || response.output_text || "No description returned.",
    labels: Array.isArray(parsed.labels) ? parsed.labels.map(String).slice(0, 8) : [],
    visualSalience:
      typeof parsed.salience === "number" && Number.isFinite(parsed.salience)
        ? Math.min(1, Math.max(0, parsed.salience))
        : 0.5
  };
}

function transcriptContextAt(segments: TranscriptSegment[], timestamp: number, radiusSeconds: number): string {
  return segments
    .filter((segment) => segment.end >= timestamp - radiusSeconds && segment.start <= timestamp + radiusSeconds)
    .map((segment) => segment.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function transcriptDensityAt(segments: TranscriptSegment[], timestamp: number, radiusSeconds: number): number {
  const context = transcriptContextAt(segments, timestamp, radiusSeconds);
  return Math.min(1, context.length / 900);
}

export async function analyzeFramesSemantically(params: {
  client: OpenAI;
  candidates: CandidateFrame[];
  transcriptSegments: TranscriptSegment[];
  visionModel: string;
  embeddingModel: string;
}): Promise<FrameAnalysis[]> {
  const described: Array<FrameAnalysis & { embedding?: number[] }> = [];

  for (const candidate of params.candidates) {
    const transcriptContext = transcriptContextAt(params.transcriptSegments, candidate.timestamp, 12);
    const vision = await describeFrame({
      client: params.client,
      model: params.visionModel,
      frame: candidate,
      transcriptContext
    });
    described.push({
      ...candidate,
      ...vision,
      semanticNovelty: 0,
      transcriptDensity: transcriptDensityAt(params.transcriptSegments, candidate.timestamp, 12),
      score: 0,
      transcriptContext
    });
  }

  if (described.length > 0) {
    const embeddingResponse = await params.client.embeddings.create({
      model: params.embeddingModel,
      input: described.map((frame) => `${frame.description}\nTags: ${frame.labels.join(", ")}`),
      encoding_format: "float"
    });

    embeddingResponse.data.forEach((item, index) => {
      described[index].embedding = item.embedding;
    });
  }

  const semanticNovelty = described.map((frame, index) => {
    const current = frame.embedding;
    if (!current) return 0.5;
    const prev = described[index - 1]?.embedding;
    const next = described[index + 1]?.embedding;
    const diffs = [prev, next]
      .filter((embedding): embedding is number[] => Boolean(embedding))
      .map((embedding) => 1 - cosineSimilarity(current, embedding));
    return diffs.length ? diffs.reduce((sum, value) => sum + value, 0) / diffs.length : 0.5;
  });

  const normalizedSemanticNovelty = normalize(semanticNovelty);
  const normalizedVisualNovelty = normalize(described.map((frame) => frame.visualNovelty));

  return described.map((frame, index) => {
    const score =
      0.38 * frame.visualSalience +
      0.26 * normalizedSemanticNovelty[index] +
      0.2 * normalizedVisualNovelty[index] +
      0.1 * frame.transcriptDensity +
      0.06 * frame.colorfulness;

    const { embedding: _embedding, ...withoutEmbedding } = frame;
    return {
      ...withoutEmbedding,
      semanticNovelty: normalizedSemanticNovelty[index],
      visualNovelty: normalizedVisualNovelty[index],
      score: Number(score.toFixed(4))
    };
  });
}
