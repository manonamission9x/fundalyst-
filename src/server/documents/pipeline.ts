export type DocumentJobStage =
  | "uploaded"
  | "stored"
  | "queued"
  | "text_extracted"
  | "tables_extracted"
  | "validated"
  | "normalized"
  | "saved"
  | "analyzed";

export interface DocumentPipelineStep {
  stage: DocumentJobStage;
  label: string;
}

export const DOCUMENT_PIPELINE: DocumentPipelineStep[] = [
  { stage: "uploaded", label: "Upload received" },
  { stage: "stored", label: "Original document stored" },
  { stage: "queued", label: "Extraction job queued" },
  { stage: "text_extracted", label: "Text extracted" },
  { stage: "tables_extracted", label: "Tables extracted" },
  { stage: "validated", label: "Financial rows validated" },
  { stage: "normalized", label: "Canonical facts normalized" },
  { stage: "saved", label: "Dataset saved" },
  { stage: "analyzed", label: "Analysis generated" },
];
