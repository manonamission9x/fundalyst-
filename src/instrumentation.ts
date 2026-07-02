/**
 * Next.js runs `register()` once when the server process starts (before any
 * request). Importing the env module here validates configuration at startup,
 * so misconfiguration fails fast with a clear message instead of surfacing as
 * a random runtime error later.
 *
 * See src/lib/env.ts and docs/environment.md.
 */
export async function register() {
  await import("@/lib/env");
}
