"use client";

import { useMemo, useState } from "react";

type Frame = {
  fileName: string;
  timestamp: number;
  score: number;
  description: string;
  labels: string[];
  dataUrl: string;
};

type SlopWarning = {
  rule: string;
  whyItBreaksTaste: string;
  rejectIf: string;
  preferredMove: string;
};

type Cinematic = {
  styleMarkdown: string;
  shotSpecMarkdown: string;
  promptMarkdown: string;
  slopWarnings: SlopWarning[];
};

type AnalyzeResponse = {
  id: string;
  metadata: {
    title?: string;
    uploader?: string;
    durationSeconds: number;
  };
  markdown: string;
  frames: Frame[];
  cinematic: Cinematic;
  zipDataUrl: string;
};

type ResultTab = "watch" | "frames" | "style" | "shot-specs" | "prompt" | "warnings";

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function formatTimestamp(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  return [hours, minutes, wholeSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [topK, setTopK] = useState(8);
  const [mode, setMode] = useState<"top-k" | "density">("density");
  const [candidateIntervalSeconds, setCandidateIntervalSeconds] = useState(8);
  const [maxCandidateFrames, setMaxCandidateFrames] = useState(36);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("watch");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => url.trim().length > 0 && !loading, [loading, url]);

  async function submit() {
    setLoading(true);
    setError("");
    setCopied(false);
    setResult(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          topK,
          mode,
          candidateIntervalSeconds,
          maxCandidateFrames,
          frameWidth: 768
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Analysis failed");
      setResult(payload);
      setActiveTab("style");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function activeText(): string {
    if (!result) return "";
    if (activeTab === "style") return result.cinematic.styleMarkdown;
    if (activeTab === "shot-specs") return result.cinematic.shotSpecMarkdown;
    if (activeTab === "prompt") return result.cinematic.promptMarkdown;
    if (activeTab === "warnings") {
      return result.cinematic.slopWarnings
        .map(
          (warning) =>
            `${warning.rule}\nWhy: ${warning.whyItBreaksTaste}\nReject if: ${warning.rejectIf}\nPrefer: ${warning.preferredMove}`
        )
        .join("\n\n");
    }
    return result.markdown;
  }

  async function copyActiveText() {
    const text = activeText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <main className="shell">
      <section className="workspace">
        <div className="inputPanel">
          <div>
            <h1>yt-view</h1>
            <p className="subhead">YouTube videos to timed transcript plus representative frames for VLM context.</p>
          </div>

          <label className="field">
            <span>YouTube URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>

          <div className="grid">
            <label className="field">
              <span>Frames</span>
              <input
                type="number"
                min={1}
                max={24}
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Candidate interval</span>
              <input
                type="number"
                min={1}
                max={120}
                value={candidateIntervalSeconds}
                onChange={(event) => setCandidateIntervalSeconds(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Max candidates</span>
              <input
                type="number"
                min={4}
                max={80}
                value={maxCandidateFrames}
                onChange={(event) => setMaxCandidateFrames(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="segmented" aria-label="selection mode">
            <button className={mode === "density" ? "active" : ""} onClick={() => setMode("density")} type="button">
              Density
            </button>
            <button className={mode === "top-k" ? "active" : ""} onClick={() => setMode("top-k")} type="button">
              Top K
            </button>
          </div>

          <button className="primary" disabled={!canSubmit} onClick={submit} type="button">
            {loading ? "Analyzing..." : "Analyze video"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="resultPanel">
          {!result && !loading ? (
            <div className="emptyState">Paste a URL and run analysis. Results appear here with copy and download controls.</div>
          ) : null}
          {loading ? (
            <div className="emptyState">Downloading, transcribing, extracting frames, and scoring semantic salience.</div>
          ) : null}
          {result ? (
            <>
              <div className="resultHeader">
                <div>
                  <h2>{result.metadata.title || "Analyzed video"}</h2>
                  <p>
                    {result.metadata.uploader ? `${result.metadata.uploader} · ` : ""}
                    {formatTimestamp(result.metadata.durationSeconds)}
                  </p>
                </div>
                <div className="actions">
                  <button type="button" onClick={copyActiveText}>
                    {copied ? "Copied" : "Copy text"}
                  </button>
                  <button type="button" onClick={() => downloadDataUrl(result.zipDataUrl, `${result.id}.zip`)}>
                    Download ZIP
                  </button>
                </div>
              </div>

              <div className="tabs" aria-label="result tabs">
                {[
                  ["watch", "Watch Pack"],
                  ["frames", "Frames"],
                  ["style", "Style Bible"],
                  ["shot-specs", "Shot Specs"],
                  ["prompt", "Codex Prompt"],
                  ["warnings", "Slop Warnings"]
                ].map(([key, label]) => (
                  <button
                    className={activeTab === key ? "active" : ""}
                    key={key}
                    onClick={() => {
                      setActiveTab(key as ResultTab);
                      setCopied(false);
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === "frames" ? (
                <div className="frames">
                  {result.frames.map((frame) => (
                    <article className="frameCard" key={frame.fileName}>
                      <img src={frame.dataUrl} alt={frame.description} />
                      <div>
                        <div className="frameMeta">
                          <strong>{formatTimestamp(frame.timestamp)}</strong>
                          <span>{frame.score.toFixed(3)}</span>
                        </div>
                        <p>{frame.description}</p>
                        <div className="tags">{frame.labels.map((label) => <span key={label}>{label}</span>)}</div>
                        <button type="button" onClick={() => downloadDataUrl(frame.dataUrl, frame.fileName)}>
                          Download frame
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {activeTab === "warnings" ? (
                <div className="warningList">
                  {result.cinematic.slopWarnings.map((warning) => (
                    <article key={warning.rule}>
                      <h3>{warning.rule}</h3>
                      <p>{warning.whyItBreaksTaste}</p>
                      <dl>
                        <dt>Reject if</dt>
                        <dd>{warning.rejectIf}</dd>
                        <dt>Prefer</dt>
                        <dd>{warning.preferredMove}</dd>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : null}

              {activeTab !== "frames" && activeTab !== "warnings" ? (
                <textarea
                  readOnly
                  value={
                    activeTab === "style"
                      ? result.cinematic.styleMarkdown
                      : activeTab === "shot-specs"
                        ? result.cinematic.shotSpecMarkdown
                        : activeTab === "prompt"
                          ? result.cinematic.promptMarkdown
                          : result.markdown
                  }
                />
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
