#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";

import { analyzeYoutubeVideo } from "./core/analyze";
import { attachFrameDataUrls } from "./core/render";
import type { FrameSelectionMode, OutputMode, ProgressEvent } from "./core/types";

/**
 * Renders pipeline progress to stderr so stdout stays clean for piping.
 * Uses a rewriting bar on a TTY and one tidy line per stage otherwise.
 */
function createCliReporter(enabled: boolean): ((event: ProgressEvent) => void) | undefined {
  if (!enabled) return undefined;
  const isTty = Boolean(process.stderr.isTTY);
  let lastStage = "";

  return (event: ProgressEvent) => {
    const pct = Math.round(event.pct * 100);
    if (isTty) {
      const width = 22;
      const filled = Math.round((pct / 100) * width);
      const bar = "█".repeat(filled) + "·".repeat(width - filled);
      const detail = event.detail ? ` — ${event.detail}` : "";
      const line = `  [${bar}] ${String(pct).padStart(3)}%  ${event.label}${detail}`;
      process.stderr.write(`\r${line.slice(0, 96).padEnd(96)}`);
      if (event.stage === "done") process.stderr.write("\n");
    } else if (event.stage !== lastStage) {
      lastStage = event.stage;
      process.stderr.write(`  ${String(pct).padStart(3)}%  ${event.label}\n`);
    }
  };
}

const program = new Command();

program
  .name("yt2ctx")
  .description("Create a timed transcript and representative frame pack from a YouTube URL.")
  .argument("<url>", "YouTube video URL")
  .option("-o, --output <dir>", "output directory")
  .option("-k, --top-k <number>", "number of frames to select", (value) => Number.parseInt(value, 10), 8)
  .option("-m, --mode <mode>", "output mode: watch, style, prompt, shot-specs, or all", "all")
  .option("--selection-mode <mode>", "frame selection mode: top-k or density", "density")
  .option("--candidate-interval <seconds>", "seconds between candidate frames", (value) => Number.parseFloat(value), 8)
  .option("--max-candidates <number>", "maximum candidate frames to send through vision analysis", (value) => Number.parseInt(value, 10), 36)
  .option("--frame-width <pixels>", "extracted frame width", (value) => Number.parseInt(value, 10), 768)
  .option("--cookies <path>", "path to a Netscape cookies.txt file for yt-dlp")
  .option("--cookies-from-browser <browser>", "browser cookie source for yt-dlp, for example: chrome, firefox")
  .option("--json", "print JSON metadata instead of markdown")
  .option("--with-data-urls", "include base64 data URLs in JSON output")
  .option("--quiet", "suppress the live progress display")
  .action(async (url: string, opts: Record<string, unknown>) => {
    let outputMode = String(opts.mode) as OutputMode;
    let selectionMode = String(opts.selectionMode) as FrameSelectionMode;

    if (["top-k", "density"].includes(outputMode)) {
      selectionMode = outputMode as FrameSelectionMode;
      outputMode = "watch";
      process.stderr.write("Warning: --mode top-k/density is deprecated. Use --selection-mode for frame selection.\n");
    }

    if (!["top-k", "density"].includes(selectionMode)) {
      throw new Error("--selection-mode must be either top-k or density");
    }
    if (!["watch", "style", "prompt", "shot-specs", "all"].includes(outputMode)) {
      throw new Error("--mode must be watch, style, prompt, shot-specs, or all");
    }

    const result = await analyzeYoutubeVideo({
      url,
      outputDir: opts.output ? String(opts.output) : undefined,
      topK: Number(opts.topK),
      selectionMode,
      outputMode,
      candidateIntervalSeconds: Number(opts.candidateInterval),
      maxCandidateFrames: Number(opts.maxCandidates),
      frameWidth: Number(opts.frameWidth),
      ytDlpAuth: {
        cookies: opts.cookies ? String(opts.cookies) : undefined,
        cookiesFromBrowser: opts.cookiesFromBrowser ? String(opts.cookiesFromBrowser) : undefined
      },
      onProgress: createCliReporter(!opts.quiet)
    });

    if (opts.json) {
      const frames = opts.withDataUrls ? await attachFrameDataUrls(result.frames) : result.frames;
      process.stdout.write(JSON.stringify({ ...result, frames }, null, 2));
    } else {
      const outputPaths =
        outputMode === "watch"
          ? [result.artifacts.markdownPath]
          : outputMode === "style"
            ? [result.artifacts.stylePath]
            : outputMode === "prompt"
              ? [result.artifacts.codexPromptPath]
              : outputMode === "shot-specs"
                ? [result.artifacts.shotSpecsMarkdownPath]
                : [
                    result.artifacts.markdownPath,
                    result.artifacts.stylePath,
                    result.artifacts.shotSpecsMarkdownPath,
                    result.artifacts.codexPromptPath
                  ];
      const text = (await Promise.all(outputPaths.map((outputPath) => readFile(outputPath, "utf8")))).join(
        "\n\n---\n\n"
      );
      process.stdout.write(`${text}\n`);
      process.stderr.write(`\nArtifacts written to ${path.relative(process.cwd(), result.artifacts.outputDir)}\n`);
    }
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`yt2ctx failed: ${message}\n`);
  process.exit(1);
});
