import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import type { VideoMetadata } from "./types";

const require = createRequire(import.meta.url);
const ffmpegStatic = require("ffmpeg-static") as string | null;
const youtubedl = require("youtube-dl-exec") as (url: string, flags: Record<string, unknown>) => Promise<unknown>;

type YoutubeDlInfo = {
  id?: string;
  title?: string;
  uploader?: string;
  duration?: number;
  webpage_url?: string;
  thumbnail?: string;
};

export async function getVideoInfo(url: string): Promise<VideoMetadata> {
  const info = (await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    callHome: false
  })) as YoutubeDlInfo;

  return {
    id: info.id,
    title: info.title,
    uploader: info.uploader,
    durationSeconds: Number(info.duration || 0),
    webpageUrl: info.webpage_url || url,
    thumbnail: info.thumbnail
  };
}

export async function downloadVideo(url: string, outputPath: string): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const ffmpegLocation = ffmpegStatic || undefined;

  await youtubedl(url, {
    output: outputPath,
    format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    mergeOutputFormat: "mp4",
    ffmpegLocation,
    noWarnings: true,
    noCheckCertificates: true,
    callHome: false
  });
}
