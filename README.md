# yt-view

`yt-view` turns a YouTube URL into a VLM-friendly context pack:

- downloads the video
- extracts compressed audio
- transcribes with timestamps
- samples candidate frames
- describes and scores frames with OpenAI vision + embeddings
- selects either top-k salient frames or salience-density samples
- extracts the reusable cinematic grammar underneath the reference
- writes copy-pasteable Markdown, a style bible, Blender/Remotion-ready shot specs, a Codex prompt, JSON metadata, selected frame JPGs, and a ZIP

It ships as a CLI, MCP stdio server, and Next.js website. The goal is not just helping VLMs watch videos; it is turning reference cinema into executable production grammar for coding agents.

## Requirements

- Node.js 20+
- `OPENAI_API_KEY`
- Network access to YouTube and OpenAI

The project uses bundled `ffmpeg` and `ffprobe` binaries. You do not need a system install.

## Setup

```bash
npm install
cp .env.example .env
# add OPENAI_API_KEY to .env
```

## CLI

```bash
npm run cli -- "https://www.youtube.com/watch?v=VIDEO_ID" -k 8 --mode all
```

Useful options:

```bash
npm run cli -- "<url>" \
  --output .yt-view \
  --top-k 10 \
  --selection-mode density \
  --mode style \
  --candidate-interval 6 \
  --max-candidates 48 \
  --frame-width 768
```

Output modes:

- `watch`: transcript plus representative frame metadata
- `style`: cinematic style bible
- `shot-specs`: Blender/Remotion-ready shot specs
- `prompt`: copy-pasteable Codex/Claude implementation prompt
- `all`: all text artifacts separated by dividers

The CLI prints the Markdown context and writes artifacts under `.yt-view/<job-id>/`:

- `watch.md`
- `style-bible.md`
- `shot-specs.md`
- `shot-specs.json`
- `codex-prompt.md`
- `metadata.json`
- `yt-view-artifacts.zip`
- `frames/*.jpg`

## MCP

Build the stdio server:

```bash
npm run build:bin
```

Add this command to an MCP client:

```bash
node /absolute/path/to/yt-view/dist/mcp.js
```

The server exposes one tool:

```text
watch_youtube
```

Arguments:

- `url` required
- `topK` default `8`
- `mode` `density` or `top-k`
- `outputMode` `watch`, `style`, `prompt`, `shot-specs`, or `all`
- `candidateIntervalSeconds` default `8`
- `maxCandidateFrames` default `36`
- `frameWidth` default `768`
- `outputDir` optional

The tool returns the requested text artifact plus selected frames as MCP image content and also writes local artifacts.

## Website

```bash
npm run dev
```

Open `http://localhost:3000`, paste a YouTube URL, choose frame selection options, and run analysis. The result page includes:

- tabs for watch pack, frames, style bible, shot specs, Codex prompt, and slop warnings
- copy button for the active text tab
- frame previews
- per-frame downloads
- ZIP download

## Cinematic Grammar Compiler

The extra outputs are designed for downstream generation systems.

`style-bible.md` extracts the production grammar:

- cinematic ontology
- reference lineage
- camera, lens, lighting, material, edit, typography, and sound language
- narration register and forbidden phrases
- reusable shot patterns
- transfer rules for new products

`shot-specs.json` makes the reference executable:

- source frame and timestamp
- shot type and purpose
- lens, focal length, aperture, rig, movement, and focus behavior
- lighting setup
- material emphasis
- Blender render passes
- diffusion finishing intent
- Remotion role
- anti-slop forbidden moves

`codex-prompt.md` is a direct implementation prompt for coding agents. It tells Codex/Claude to build a physically grounded Blender-first pipeline with diffusion as finishing and Remotion as editorial assembly, not as the visual substrate.

`slopWarnings` are validator-ready rules that identify presentation-deck failure modes such as arbitrary floating UI, LinkedIn announcement language, missing lens metadata, and ungrounded abstract AI visuals.

## Vercel

This repo is intended to deploy through the linked GitHub repository. Push to the configured production branch and let Vercel build automatically.

Set `OPENAI_API_KEY` in the Vercel project settings before relying on automatic deployments:

```bash
OPENAI_API_KEY=...
```

This app is configured for Node.js runtime and a 300 second function duration. Vercel serverless limits still apply; long videos are better processed through the CLI or MCP server. Short videos and clips fit the hosted web path.

## Frame Selection

`top-k` sorts candidate frames by score and returns the highest scoring frames.

`density` treats salience scores as a timeline density and samples across weighted buckets. This usually gives a more representative sequence across the whole video while still preferring information-rich moments.

The score combines:

- OpenAI vision salience
- semantic novelty from frame descriptions
- visual scene-change novelty
- nearby transcript density
- colorfulness

## OpenAI Models

Defaults are set in `.env.example`:

```bash
OPENAI_TRANSCRIBE_MODEL=whisper-1
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

`whisper-1` is used by default because it supports verbose JSON with segment timestamps.

## Notes

Only process videos you have the right to download and analyze. YouTube availability and extractor behavior can change; `youtube-dl-exec` bundles `yt-dlp`, which is more robust than browser-only download libraries.
