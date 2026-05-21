import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "Legal — Youtube to Context",
  description: "Usage, rights, and deployment notes for Youtube to Context."
};

export default function LegalPage() {
  return <InfoPageView page={infoPages.legal} />;
}
