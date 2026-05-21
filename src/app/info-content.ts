export type InfoPage = {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: {
    title: string;
    body: string[];
    code?: string;
    items?: { term: string; description: string }[];
  }[];
  cta?: { href: string; label: string };
};

export const infoPages: Record<string, InfoPage> = {
  web: {
    slug: "web",
    eyebrow: "Browser interface",
    title: "A live analyzer for short clips and reviewable runs.",
    intro:
      "Paste a YouTube URL, tune frame sampling, watch the pipeline move, then inspect the context pack without leaving the browser.",
    sections: [
      {
        title: "What the web app is for",
        body: [
          "The web interface is the fastest path when you want to inspect a result visually: thumbnails, progress, selected frames, rendered Markdown, raw artifacts, and a downloadable ZIP.",
          "It uses the same core analyzer as the CLI and MCP server. The browser does not run a lighter path; it calls the streaming HTTP endpoint and renders progress as NDJSON events arrive."
        ]
      },
      {
        title: "Run it locally",
        body: ["Set OPENAI_API_KEY in .env, install dependencies, and start Next.js."],
        code: "npm install\ncp .env.example .env\nnpm run dev"
      },
      {
        title: "Best fit",
        body: [
          "Use the hosted or local web app for demos, quick reference extraction, and reviewing frame selections before handing the output to an agent.",
          "For long videos, unattended jobs, or batch work, use the CLI or MCP server so the process is not tied to a browser request timeout."
        ]
      }
    ],
    cta: { href: "/", label: "Open analyzer" }
  },
  cli: {
    slug: "cli",
    eyebrow: "Terminal interface",
    title: "Scriptable context packs from the command line.",
    intro:
      "The CLI is for local jobs, batch processing, shell pipelines, and runs where stdout needs to stay machine-readable.",
    sections: [
      {
        title: "Basic run",
        body: [
          "The default command writes a job folder under .yt2ctx and prints the requested artifact text to stdout."
        ],
        code: 'npm run cli -- "https://www.youtube.com/watch?v=VIDEO_ID"'
      },
      {
        title: "Useful options",
        body: ["Tune output mode, selected frame count, candidate sampling, and output directory."],
        code:
          'npm run cli -- "<url>" \\\n  --output .yt2ctx \\\n  --top-k 10 \\\n  --selection-mode density \\\n  --mode style \\\n  --candidate-interval 6 \\\n  --max-candidates 48 \\\n  --frame-width 768'
      },
      {
        title: "Why it exists",
        body: [
          "The CLI keeps progress on stderr and artifacts on stdout, which makes it safe to pipe into other tools.",
          "It is the right interface for repeatable local work, longer videos, and automation that should not depend on a web session."
        ]
      }
    ],
    cta: { href: "https://github.com/JacobFV/yt2ctx#cli", label: "Read CLI docs" }
  },
  mcp: {
    slug: "mcp",
    eyebrow: "Agent interface",
    title: "Expose the pipeline as a stdio MCP tool.",
    intro:
      "The MCP server lets Claude Desktop, Claude Code, and other MCP clients ask for a video context pack through one tool: watch_youtube.",
    sections: [
      {
        title: "Build the server",
        body: ["Compile the stdio server before registering it with a client."],
        code: "npm install\nnpm run build:bin"
      },
      {
        title: "Register with a client",
        body: [
          "Point the client at dist/mcp.js and provide OPENAI_API_KEY in the server environment.",
          "MCP clients often launch servers from arbitrary working directories, so passing the key explicitly in client config is the most reliable setup."
        ],
        code:
          'claude mcp add yt2ctx \\\n  --env OPENAI_API_KEY=sk-... \\\n  -- node /absolute/path/to/yt2ctx/dist/mcp.js'
      },
      {
        title: "Tool arguments",
        body: ["watch_youtube accepts the same core controls as the web and CLI surfaces."],
        items: [
          { term: "url", description: "Required YouTube URL." },
          { term: "topK", description: "Number of frames to select. Default: 8." },
          { term: "mode", description: "Frame selection strategy: density or top-k." },
          { term: "outputMode", description: "watch, style, prompt, shot-specs, or all." },
          { term: "outputDir", description: "Optional artifact output directory." }
        ]
      }
    ],
    cta: { href: "https://github.com/JacobFV/yt2ctx#mcp-server", label: "Read MCP docs" }
  },
  "api-reference": {
    slug: "api-reference",
    eyebrow: "HTTP API",
    title: "One endpoint, buffered JSON or streaming NDJSON.",
    intro:
      "POST /api/analyze runs the same analyzer behind the browser. Send Accept: application/x-ndjson for live progress, or use a normal JSON response for headless agents.",
    sections: [
      {
        title: "Discover the contract",
        body: ["GET /api/analyze returns a machine-readable contract for the endpoint."],
        code: "curl -s http://localhost:3000/api/analyze"
      },
      {
        title: "Buffered JSON",
        body: ["Use this mode when you just need the final result object."],
        code:
          'curl -s -X POST http://localhost:3000/api/analyze \\\n  -H "Content-Type: application/json" \\\n  -d \'{"url":"https://youtu.be/VIDEO_ID"}\''
      },
      {
        title: "Streaming NDJSON",
        body: [
          "Use this mode for live progress. The stream emits progress objects, then one final result object. Errors arrive as an error object on the stream."
        ],
        code:
          'curl -N -X POST http://localhost:3000/api/analyze \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/x-ndjson" \\\n  -d \'{"url":"https://youtu.be/VIDEO_ID"}\''
      },
      {
        title: "Request fields",
        body: ["All optional fields have defaults that match the web app."],
        items: [
          { term: "url", description: "Required YouTube URL." },
          { term: "topK", description: "Integer from 1 to 24. Default: 8." },
          { term: "mode", description: "density or top-k. Default: density." },
          { term: "candidateIntervalSeconds", description: "Seconds between sampled frames. Default: 8." },
          { term: "maxCandidateFrames", description: "Candidate frames sent to vision. Default: 36." },
          { term: "frameWidth", description: "Extracted frame width in pixels. Default: 768." }
        ]
      }
    ],
    cta: { href: "/api/analyze", label: "Open API contract" }
  },
  about: {
    slug: "about",
    eyebrow: "About",
    title: "Reference cinema into executable production grammar.",
    intro:
      "Youtube to Context turns a video into timed context, representative stills, and cinematic instructions that downstream coding and generation agents can actually use.",
    sections: [
      {
        title: "The pipeline",
        body: [
          "A run downloads the source, extracts audio, transcribes speech, samples frames, scores visual salience, selects representative stills, and compiles reusable cinematic grammar.",
          "The output is intentionally practical: Markdown for humans and agents, JSON for systems, frame images for visual grounding, and a ZIP bundle for handoff."
        ]
      },
      {
        title: "One core, three surfaces",
        body: [
          "The web app, CLI, MCP server, and HTTP API all call the same TypeScript core. That keeps behavior consistent whether the user is reviewing a run, scripting a batch, or letting an MCP client request context directly."
        ],
        items: [
          { term: "Web", description: "Interactive review and artifact download." },
          { term: "CLI", description: "Local automation and long-running jobs." },
          { term: "MCP", description: "Agent-native access through watch_youtube." },
          { term: "API", description: "Buffered JSON and streaming NDJSON for integrations." }
        ]
      },
      {
        title: "Status",
        body: [
          "This is an MIT-licensed project. Public deployments should add authentication and usage limits before exposing the analyzer, because each run can incur OpenAI usage."
        ]
      }
    ],
    cta: { href: "https://github.com/JacobFV/yt2ctx", label: "View source" }
  },
  legal: {
    slug: "legal",
    eyebrow: "Legal",
    title: "Use it only with videos you are allowed to process.",
    intro:
      "This page is a practical usage notice for this project. It is not legal advice.",
    sections: [
      {
        title: "Video rights",
        body: [
          "Only analyze videos you own, have permission to process, or are otherwise legally allowed to download and analyze.",
          "You are responsible for complying with YouTube terms, source-site terms, copyright rules, privacy obligations, and any usage restrictions that apply to your context."
        ]
      },
      {
        title: "Data handling",
        body: [
          "Local CLI and MCP runs write artifacts to your configured output directory. The web route writes temporary artifacts on the server while building the response ZIP.",
          "Do not submit confidential, private, or regulated material unless your deployment, OpenAI account configuration, and operating environment are approved for that use."
        ]
      },
      {
        title: "Public deployments",
        body: [
          "The analyzer can consume paid API usage. A public deployment should add authentication, rate limits, abuse controls, and clear user terms before accepting arbitrary traffic.",
          "The project is provided under the MIT License without warranty. See the repository LICENSE for the full license text."
        ]
      }
    ],
    cta: { href: "https://github.com/JacobFV/yt2ctx/blob/main/LICENSE", label: "Read license" }
  }
};
