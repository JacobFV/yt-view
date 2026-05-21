import type { Metadata } from "next";

import { infoPages } from "../info-content";
import { InfoPageView } from "../info-page";

export const metadata: Metadata = {
  title: "About — Youtube to Context",
  description: "About the Youtube to Context cinematic context compiler."
};

export default function AboutPage() {
  return <InfoPageView page={infoPages.about} />;
}
