import { buildCommand } from "@stricli/core";

export const authCommand = buildCommand({
  loader: async () => {
    const { executeAuthFlow } = await import("./impl.js");
    return executeAuthFlow;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      provider: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "OAuth2 provider (gitlab, github)",
        optional: true,
      },
      "client-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 client ID",
        optional: true,
      },
      "client-secret": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 client secret",
        optional: true,
      },
      scopes: {
        kind: "parsed",
        parse: (input: string) => input.split(",").map((s) => s.trim()),
        brief: "Comma-separated OAuth2 scopes to request",
        optional: true,
      },
      port: {
        kind: "parsed",
        parse: (input: string) => {
          const port = parseInt(input, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error("Port must be a number between 1 and 65535");
          }
          return port;
        },
        brief: "Preferred port for callback server",
        optional: true,
      },
      "redirect-uri": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Custom redirect URI",
        optional: true,
      },
      timeout: {
        kind: "parsed",
        parse: (input: string) => {
          const timeout = parseInt(input, 10);
          if (isNaN(timeout) || timeout < 10 || timeout > 1800) {
            throw new Error("Timeout must be between 10 and 1800 seconds");
          }
          return timeout;
        },
        brief: "Timeout in seconds for auth flow",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account identifier for storage",
        optional: true,
      },
      name: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Display name for account",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Authenticate with OAuth2 providers using browser flow",
  },
});
