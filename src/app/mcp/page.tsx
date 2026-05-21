import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "MCP server — Youtube to Context",
  description: "Expose Youtube to Context as a stdio MCP server with the watch_youtube tool."
};

export default function McpPage() {
  return <InfoPageView page={infoPages.mcp} />;
}
