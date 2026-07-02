import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId: string;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
  requestId: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const statusByCode: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  NOT_IMPLEMENTED: 501,
  INTERNAL_ERROR: 500,
};

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function apiOk<T>(data: T, init?: ResponseInit & { requestId?: string }) {
  const requestId = init?.requestId ?? createRequestId();
  return NextResponse.json<ApiSuccess<T>>(
    { ok: true, data, requestId },
    {
      ...init,
      status: init?.status ?? 200,
      headers: withRequestId(init?.headers, requestId),
    }
  );
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  init?: ResponseInit & { requestId?: string }
) {
  const requestId = init?.requestId ?? createRequestId();
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message }, requestId },
    {
      ...init,
      status: init?.status ?? statusByCode[code],
      headers: withRequestId(init?.headers, requestId),
    }
  );
}

function withRequestId(headers: HeadersInit | undefined, requestId: string): Headers {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("x-request-id", requestId);
  return nextHeaders;
}
