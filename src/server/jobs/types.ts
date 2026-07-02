export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface JobRecord {
  id: string;
  type: "document_import" | "ai_analysis";
  status: JobStatus;
  projectId?: string;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
