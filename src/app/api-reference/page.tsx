import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "API reference — Youtube to Context",
  description: "POST /api/analyze as buffered JSON or streaming NDJSON for Youtube to Context integrations."
};

export default function ApiReferencePage() {
  return <InfoPageView page={infoPages["api-reference"]} />;
}
