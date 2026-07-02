/**
 * Better Auth — Next.js API route handler
 *
 * Mounts Better Auth at /api/auth/* for all auth endpoints:
 *   POST /api/auth/signup/email
 *   POST /api/auth/login/email
 *   POST /api/auth/logout
 *   GET  /api/auth/session
 *   GET  /api/auth/list-sessions
 *   POST /api/auth/revoke-session
 *   POST /api/auth/revoke-other-sessions
 *   etc.
 *
 * See: https://www.better-auth.com/docs/installation
 */

import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Better Auth uses toNextJsHandler for Next.js API route compatibility.
// auth.handler is (Request) => Promise<Response>;
// toNextJsHandler wraps it into { GET, POST, PUT, PATCH, DELETE }.
const { GET, POST, PUT, PATCH, DELETE } = auth.handler as unknown as {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
  PUT: (req: Request) => Promise<Response>;
  PATCH: (req: Request) => Promise<Response>;
  DELETE: (req: Request) => Promise<Response>;
};

export { GET, POST, PUT, PATCH, DELETE };
