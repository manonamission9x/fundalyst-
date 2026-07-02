/**
 * Fundalyst — Shared service types
 *
 * Domain-agnostic types used across services and API handlers.
 */

import type { ApiErrorCode } from "@/server/api/response";

// ──────────────────────────────────────────────
// Pagination
// ──────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string; // Cursor-based pagination (opaque)
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ──────────────────────────────────────────────
// Common API shapes
// ──────────────────────────────────────────────

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Health / capability
// ──────────────────────────────────────────────

export { type BackendStatus, type BackendCapability } from "@/server/backend-status";
