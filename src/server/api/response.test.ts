import { describe, expect, it } from "vitest";

import { createRequestId } from "./response";

describe("createRequestId", () => {
  it("returns a request id", () => {
    expect(createRequestId()).toEqual(expect.any(String));
    expect(createRequestId().length).toBeGreaterThan(8);
  });
});
