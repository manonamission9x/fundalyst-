export interface UploadInput {
  workspaceId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
}
