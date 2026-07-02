import { describe, expect, it } from "vitest";

import { getBackendStatus } from "./backend-status";

describe("getBackendStatus", () => {
  it("describes the backend as local-first", () => {
    const status = getBackendStatus(new Date("2026-07-02T00:00:00.000Z"));

    expect(status.mode).toBe("local_first");
    expect(status.generatedAt).toBe("2026-07-02T00:00:00.000Z");
    expect(status.capabilities.map((capability) => capability.key)).toEqual([
      "database",
      "auth",
      "queue",
      "storage",
      "ocr",
      "ai",
    ]);
  });
});
