// src/utils/callbackManager.test.ts

import { createCallbackManager } from "./callbackManager";

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
});
