import type { FrameAnalysis, FrameSelectionMode } from "./types";

export function selectFrames(
  frames: FrameAnalysis[],
  topK: number,
  mode: FrameSelectionMode
): FrameAnalysis[] {
  const k = Math.max(1, Math.min(topK, frames.length));
  if (mode === "top-k") {
    return [...frames]
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  const sorted = [...frames].sort((a, b) => a.timestamp - b.timestamp);
  const weights = sorted.map((frame) => Math.max(0.01, frame.score));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const selected = new Set<number>();

  for (let bucket = 0; bucket < k; bucket += 1) {
    const startMass = (bucket / k) * total;
    const endMass = ((bucket + 1) / k) * total;
    let mass = 0;
    let best: FrameAnalysis | undefined;
    for (let index = 0; index < sorted.length; index += 1) {
      const frame = sorted[index];
      const nextMass = mass + weights[index];
      const overlapsBucket = nextMass >= startMass && mass <= endMass;
      if (overlapsBucket && !selected.has(frame.index) && (!best || frame.score > best.score)) {
        best = frame;
      }
      mass = nextMass;
    }
    if (best) selected.add(best.index);
  }

  if (selected.size < k) {
    for (const frame of [...frames].sort((a, b) => b.score - a.score)) {
      selected.add(frame.index);
      if (selected.size === k) break;
    }
  }

  return sorted.filter((frame) => selected.has(frame.index));
}
