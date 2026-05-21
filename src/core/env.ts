import "dotenv/config";

export function getOpenAiKey(explicit?: string): string {
  const key = explicit || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required. Add it to .env or pass openAiApiKey.");
  }
  return key;
}

export function defaultOutputDir(): string {
  return process.env.YT2CTX_OUTPUT_DIR || ".yt2ctx";
}
