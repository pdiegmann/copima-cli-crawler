// Callback management types

export type CallbackFunction<T = Record<string, unknown>, R = Record<string, unknown>> = (context: Record<string, unknown>, data: T) => Promise<R> | R;

export type CallbackConfig = {
  name: string;
  enabled: boolean;
  priority?: number;
  filters?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

// Re-export callback manager functions
export { CallbackManager, createCallbackManager } from "./callbackManager";
