import { describe, expect, it } from "@jest/globals";
import { isCalledFromOrchestrator, markFlagsFromOrchestrator } from "./impl";

describe("crawl orchestrator helpers", () => {
  it("marks flags without mutating the original object", () => {
    const baseFlags = { foo: "bar" } as Record<string, unknown>;

    const markedFlags = markFlagsFromOrchestrator(baseFlags);

    expect(markedFlags).not.toBe(baseFlags);
    expect(isCalledFromOrchestrator(markedFlags)).toBe(true);
    expect(isCalledFromOrchestrator(baseFlags)).toBe(false);
  });

  it("reuses flagged objects to avoid unnecessary cloning", () => {
    const firstPass = markFlagsFromOrchestrator({ baz: 1 });
    const secondPass = markFlagsFromOrchestrator(firstPass);

    expect(secondPass).toBe(firstPass);
  });

  it("creates orchestrated flags when none are provided", () => {
    const markedFlags = markFlagsFromOrchestrator(undefined);

    expect(isCalledFromOrchestrator(markedFlags)).toBe(true);
  });
});
