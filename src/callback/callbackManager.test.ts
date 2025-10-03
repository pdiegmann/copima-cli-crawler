// src/utils/callbackManager.test.ts

import { createCallbackManager } from "./callbackManager";

// Mock logger
jest.mock("../logging", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe("CallbackManager", () => {
  const configInline = {
    enabled: true,
    inlineCallback: (ctx: any, obj: any) => ({ ...obj, processed: true }),
  };

  const configModule = {
    enabled: true,
    modulePath: "./__mock_callback_module__",
  };

  const configDisabled = {
    enabled: false,
  };

  it("should process object with inline callback", async () => {
    const mgr = createCallbackManager(configInline as any);
    const obj = { id: 1 };
    const result = await mgr.processObject({ resourceType: "test" } as any, obj);
    expect(result.processed).toBe(true);
  });

  it("should process objects in batch", async () => {
    const mgr = createCallbackManager(configInline as any);
    const objs = [{ id: 1 }, { id: 2 }];
    const results = await mgr.processObjects({ resourceType: "test" } as any, objs);
    expect(results.length).toBe(2);
    expect(results[0].processed).toBe(true);
  });

  it("should filter out object if callback returns false", async () => {
    const mgr = createCallbackManager({
      enabled: true,
      inlineCallback: () => false,
    } as any);
    const objs = [{ id: 1 }, { id: 2 }];
    const results = await mgr.processObjects({ resourceType: "test" } as any, objs);
    expect(results.length).toBe(0);
  });

  it("should return original object if callback throws", async () => {
    const mgr = createCallbackManager({
      enabled: true,
      inlineCallback: () => {
        throw new Error("fail");
      },
    } as any);
    const obj = { id: 1 };
    const result = await mgr.processObject({ resourceType: "test" } as any, obj);
    expect(result).toBe(obj);
  });

  it("should return objects as-is if disabled", async () => {
    const mgr = createCallbackManager(configDisabled as any);
    const objs = [{ id: 1 }];
    const results = await mgr.processObjects({ resourceType: "test" } as any, objs);
    expect(results).toEqual(objs);
  });

  it("should update config and reload callback", async () => {
    const mgr = createCallbackManager(configDisabled as any);
    await mgr.updateConfig(configInline as any);
    const obj = { id: 1 };
    const result = await mgr.processObject({ resourceType: "test" } as any, obj);
    expect(result.processed).toBe(true);
  });

  it("should be ready when enabled and callback loaded", async () => {
    const mgr = createCallbackManager(configInline as any);
    expect(mgr.isReady()).toBe(true);
  });

  it("should not be ready when disabled", async () => {
    const mgr = createCallbackManager(configDisabled as any);
    expect(mgr.isReady()).toBe(false);
  });

  it("should get config", () => {
    const mgr = createCallbackManager(configInline as any);
    expect(mgr.getConfig().enabled).toBe(true);
  });

  it("should handle enabled with no callback or module path", async () => {
    const mgr = createCallbackManager({
      enabled: true,
    } as any);

    // Should be disabled after warning
    expect(mgr.isReady()).toBe(false);
  });

  it("should handle module loading errors", async () => {
    const mgr = createCallbackManager({
      enabled: true,
      modulePath: "./nonexistent-module",
    } as any);

    // loadCallback is async but not awaited, so callback starts as null
    // isReady() checks: isEnabled && callback !== null
    // So it returns false initially
    expect(mgr.isReady()).toBe(false);

    // Give time for async loading to fail
    await new Promise(resolve => setTimeout(resolve, 100));

    // After async failure, callback should still be null
    expect(mgr.isReady()).toBe(false);
  });

  it("should return object when processObject gets null from callback", async () => {
    const mgr = createCallbackManager({
      enabled: true,
      inlineCallback: () => null,
    } as any);

    const obj = { id: 1 };
    const result = await mgr.processObject({ resourceType: "test" } as any, obj);

    // When callback returns null, code does: return result || object
    // So null || object returns the original object
    expect(result).toBe(obj);
  });

  it("should handle errors in processObjects batch", async () => {
    let callCount = 0;
    const mgr = createCallbackManager({
      enabled: true,
      inlineCallback: () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Batch error");
        }
        return { processed: true };
      },
    } as any);

    const objs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const results = await mgr.processObjects({ resourceType: "test" } as any, objs);

    // All objects should be returned (error on second should add original)
    expect(results.length).toBe(3);
  });

  it("should handle non-array input in processObjects", async () => {
    const mgr = createCallbackManager(configInline as any);
    const notArray = { id: 1 } as any;
    const result = await mgr.processObjects({ resourceType: "test" } as any, notArray);

    // Should return input as-is
    expect(result).toBe(notArray);
  });

  it("should update config without reloading when disabled", async () => {
    const mgr = createCallbackManager(configDisabled as any);
    await mgr.updateConfig({
      enabled: false,
      modulePath: "./some-module",
    } as any);

    expect(mgr.isReady()).toBe(false);
  });

  it("should update config and reload when module path changes", async () => {
    const mgr = createCallbackManager({
      enabled: true,
      modulePath: "./old-module",
    } as any);

    await mgr.updateConfig({
      enabled: true,
      inlineCallback: (ctx: any, obj: any) => ({ ...obj, modified: true }),
    } as any);

    const obj = { id: 1 };
    const result = await mgr.processObject({ resourceType: "test" } as any, obj);

    expect(result.modified).toBe(true);
  });

  it("should filter objects and log count", async () => {
    const mgr = createCallbackManager({
      enabled: true,
      inlineCallback: (ctx: any, obj: any) => obj.id === 1 ? obj : false,
    } as any);

    const objs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const results = await mgr.processObjects({ resourceType: "test" } as any, objs);

    expect(results.length).toBe(1);
    expect(results[0].id).toBe(1);
  });

  it("should return object when callback returns undefined", async () => {
    const mgr = createCallbackManager({
      enabled: true,
      inlineCallback: () => undefined,
    } as any);

    const obj = { id: 1 };
    const result = await mgr.processObject({ resourceType: "test" } as any, obj);

    // Undefined should return original object
    expect(result).toBe(obj);
  });
});
