import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "Web app — Youtube to Context",
  description: "Use Youtube to Context in the browser with live NDJSON progress and artifact downloads."
};

export default function WebPage() {
  return <InfoPageView page={infoPages.web} />;
}
