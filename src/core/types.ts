export type FrameSelectionMode = "top-k" | "density";

export type AnalyzeVideoOptions = {
  url: string;
  outputDir?: string;
  topK?: number;
  mode?: FrameSelectionMode;
  candidateIntervalSeconds?: number;
  maxCandidateFrames?: number;
  frameWidth?: number;
  keepWorkDir?: boolean;
  openAiApiKey?: string;
  transcribeModel?: string;
  visionModel?: string;
  embeddingModel?: string;
};

export type VideoMetadata = {
  id?: string;
  title?: string;
  uploader?: string;
  durationSeconds: number;
  webpageUrl: string;
  thumbnail?: string;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type CandidateFrame = {
  index: number;
  timestamp: number;
  path: string;
  fileName: string;
  visualVector: number[];
  visualNovelty: number;
  brightness: number;
  colorfulness: number;
};

export type FrameAnalysis = CandidateFrame & {
  description: string;
  labels: string[];
  visualSalience: number;
  semanticNovelty: number;
  transcriptDensity: number;
  score: number;
  transcriptContext: string;
  dataUrl?: string;
};

export type VideoAnalysisResult = {
  id: string;
  createdAt: string;
  sourceUrl: string;
  metadata: VideoMetadata;
  options: Required<
    Pick<
      AnalyzeVideoOptions,
      | "topK"
      | "mode"
      | "candidateIntervalSeconds"
      | "maxCandidateFrames"
      | "frameWidth"
      | "transcribeModel"
      | "visionModel"
      | "embeddingModel"
    >
  >;
  transcriptText: string;
  transcriptSegments: TranscriptSegment[];
  frames: FrameAnalysis[];
  artifacts: {
    outputDir: string;
    markdownPath: string;
    metadataPath: string;
    zipPath: string;
    frameDir: string;
  };
  markdown: string;
};
