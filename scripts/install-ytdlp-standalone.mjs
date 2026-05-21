import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);

const ASSETS = {
  "linux-x64": "yt-dlp_linux",
  "linux-arm64": "yt-dlp_linux_aarch64",
  "darwin-x64": "yt-dlp_macos",
  "darwin-arm64": "yt-dlp_macos",
  "win32-x64": "yt-dlp.exe"
};

function assetName() {
  return ASSETS[`${process.platform}-${process.arch}`];
}

async function fileLooksExecutable(filePath) {
  try {
    const file = await stat(filePath);
    return file.isFile() && file.size > 1024 * 1024;
  } catch {
    return false;
  }
}

async function main() {
  const asset = assetName();
  if (!asset) {
    console.warn(`Skipping yt-dlp standalone install for ${process.platform}-${process.arch}.`);
    return;
  }

  const packagePath = require.resolve("youtube-dl-exec/package.json");
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const binaryPath = path.join(path.dirname(packagePath), "bin", binaryName);

  if (await fileLooksExecutable(binaryPath)) {
    const response = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`, {
      headers: { "User-Agent": "yt2ctx-build" }
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${asset}: ${response.status} ${response.statusText}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    await mkdir(path.dirname(binaryPath), { recursive: true });
    await writeFile(binaryPath, bytes);
    await chmod(binaryPath, 0o755);
    console.log(`Installed standalone ${asset} at ${binaryPath}.`);
    return;
  }

  throw new Error(`Unable to find youtube-dl-exec binary path at ${binaryPath}.`);
}

await main();
