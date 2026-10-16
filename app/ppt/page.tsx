import type { Metadata } from "next";
import { PresentationViewer } from "./presentation-viewer";

export const metadata: Metadata = {
  title: "Presentation",
  description:
    "An interactive presentation of ExamOpt Studio for GLA HackVision 2.0.",
};

export default function PresentationPage() {
  return <PresentationViewer />;
}
