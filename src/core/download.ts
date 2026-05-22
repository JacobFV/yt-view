import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import type { VideoMetadata, YtDlpAuthOptions } from "./types";

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

function authFlags(auth?: YtDlpAuthOptions): Record<string, string> {
  const cookies = auth?.cookies || process.env.YT2CTX_YTDLP_COOKIES;
  const cookiesFromBrowser = auth?.cookiesFromBrowser || process.env.YT2CTX_YTDLP_COOKIES_FROM_BROWSER;
  return {
    ...(cookies ? { cookies } : {}),
    ...(cookiesFromBrowser ? { cookiesFromBrowser } : {})
  };
}

export async function getVideoInfo(url: string, auth?: YtDlpAuthOptions): Promise<VideoMetadata> {
  const info = (await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    ...authFlags(auth)
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

export async function downloadVideo(
  url: string,
  outputPath: string,
  auth?: YtDlpAuthOptions
): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const ffmpegLocation = ffmpegStatic || undefined;

  await youtubedl(url, {
    output: outputPath,
    format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    mergeOutputFormat: "mp4",
    ffmpegLocation,
    noWarnings: true,
    noCheckCertificates: true,
    ...authFlags(auth)
  });
}
