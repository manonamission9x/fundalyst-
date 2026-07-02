/**
 * Users module — serves as the domain boundary for user operations.
 *
 * Phase 1: basic profile operations via Better Auth.
 * Phase 2+: profile management, preferences, settings.
 *
 * Route handlers in src/app/api/users/* call these service functions.
 */

import { findUserById } from "@/modules/users/repository";

export async function getUserById(id: string) {
  return findUserById(id);
}

export type UserProfile = Awaited<ReturnType<typeof getUserById>>;
