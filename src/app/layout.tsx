import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Youtube to Context — cinematic context compiler",
  description:
    "Turn any YouTube video into a VLM-ready context pack: timed transcript, representative frames, and the cinematic grammar underneath — compiled into copy-paste artifacts for coding agents.",
  keywords: ["youtube", "transcription", "vision", "vlm", "mcp", "cinematic grammar"],
  authors: [{ name: "Youtube to Context" }],
  openGraph: {
    title: "Youtube to Context — cinematic context compiler",
    description:
      "Timed transcript, the frames that matter, and reusable cinematic grammar — from any YouTube URL.",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#e8e2d4",
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
