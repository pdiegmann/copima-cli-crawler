import { describe, expect, it } from "@jest/globals";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import yaml from "js-yaml";
import { tmpdir } from "os";
import { join } from "path";
import { defaultConfig } from "./defaults.js";
import type { WizardPrompter } from "./setupWizard";
import { runSetupWizard } from "./setupWizard.js";
import type { ConfigValidationError } from "./validation/types.js";

type PromptRecord = {
  type: "input" | "password" | "confirm" | "select";
  message: string;
};

type PromptScript = {
  inputs?: string[];
  passwords?: string[];
  confirms?: boolean[];
  selects?: string[];
};

class SequencePrompter implements WizardPrompter {
  private readonly script: PromptScript;
  private inputIndex = 0;
  private passwordIndex = 0;
  private confirmIndex = 0;
  private selectIndex = 0;

  readonly history: PromptRecord[] = [];

  constructor(script: PromptScript) {
    this.script = {
      inputs: [],
      passwords: [],
      confirms: [],
      selects: [],
      ...script,
    };
  }

  async input(message: string): Promise<string> {
    this.history.push({ type: "input", message });
    const value = this.script.inputs?.[this.inputIndex++];
    if (value === undefined) {
      throw new Error(`No scripted input value for: ${message}`);
    }
    return value;
  }

  async password(message: string): Promise<string> {
    this.history.push({ type: "password", message });
    const value = this.script.passwords?.[this.passwordIndex++];
    if (value === undefined) {
      throw new Error(`No scripted password value for: ${message}`);
    }
    return value;
  }

  async confirm(message: string): Promise<boolean> {
    this.history.push({ type: "confirm", message });
    const value = this.script.confirms?.[this.confirmIndex++];
    if (value === undefined) {
      throw new Error(`No scripted confirm value for: ${message}`);
    }
    return value;
  }

  async select(message: string, choices: Array<{ label: string; value: string }>): Promise<string> {
    this.history.push({ type: "select", message });
    const value = this.script.selects?.[this.selectIndex++];
    if (value === undefined) {
      throw new Error(`No scripted select value for: ${message}`);
    }
    if (!choices.some((choice) => choice.value === value)) {
      throw new Error(`Value '${value}' not among provided choices`);
    }
    return value;
  }

  async close(): Promise<void> {
    // no-op
  }
}

describe("setup wizard", () => {
  it("collects missing fields and writes configuration", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "copima-wizard-"));
    const targetPath = join(tempDir, "copima.yaml");

    const prompter = new SequencePrompter({
      inputs: [
        "https://gitlab.example.com",
        "client-id",
        "https://gitlab.com/oauth/authorize",
        "https://gitlab.com/oauth/token",
        "api,read_user",
        "http://localhost:3000/callback",
      ],
      passwords: ["client-secret"],
      confirms: [true, false],
      selects: ["gitlab"],
    });

    const issues: ConfigValidationError[] = [
      { field: "gitlab.host", message: "required", severity: "error" },
      { field: "gitlab.accessToken", message: "required", severity: "error" },
    ];

    try {
      const result = await runSetupWizard({
        initialConfig: defaultConfig,
        issues,
        preferredTargetPath: targetPath,
        prompter,
        launchAuthFlow: false,
      });

      expect(result.status).toBe("completed");

      const stored = yaml.load(readFileSync(targetPath, "utf8")) as any;
      expect(stored.gitlab.host).toBe("https://gitlab.example.com");
      expect(stored.gitlab?.accessToken).toBeUndefined();
      expect(stored.oauth2?.providers?.gitlab).toEqual(
        expect.objectContaining({
          clientId: "client-id",
          clientSecret: "client-secret",
          authorizationUrl: "https://gitlab.com/oauth/authorize",
          tokenUrl: "https://gitlab.com/oauth/token",
          redirectUri: "http://localhost:3000/callback",
        })
      );

      expect(prompter.history).toEqual([
        { type: "input", message: "GitLab host URL" },
        { type: "confirm", message: "Configure OAuth2 client credentials now?" },
        { type: "select", message: "Which OAuth2 provider do you want to configure?" },
        { type: "input", message: "OAuth2 client ID" },
        { type: "password", message: "OAuth2 client secret" },
        { type: "input", message: "Authorization URL" },
        { type: "input", message: "Token URL" },
        { type: "input", message: "Scopes (comma-separated)" },
        { type: "input", message: "Redirect URI" },
        { type: "confirm", message: "Configure OAuth2 callback server settings now?" },
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("reuses existing OAuth defaults when settings already exist", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "copima-wizard-"));
    const targetPath = join(tempDir, "copima.yaml");

    const existingConfig = {
      gitlab: { host: "https://gitlab.example.com" },
      oauth2: {
        providers: {
          gitlab: {
            clientId: "existing-client",
            clientSecret: "existing-secret",
            authorizationUrl: "https://gitlab.example.com/oauth/authorize",
            tokenUrl: "https://gitlab.example.com/oauth/token",
            redirectUri: "http://localhost:3000/callback",
            scopes: ["api", "read_user"],
          },
        },
        server: {
          port: 4000,
          callbackPath: "/api/auth/oauth2/callback/gitlab",
          timeout: 600,
        },
      },
    };

    writeFileSync(targetPath, yaml.dump(existingConfig));

    const prompter = new SequencePrompter({
      inputs: [
        "https://gitlab.example.com",
        "existing-client",
        "https://gitlab.example.com/oauth/authorize",
        "https://gitlab.example.com/oauth/token",
        "api,read_user",
        "http://localhost:3000/callback",
        "4000",
        "/api/auth/oauth2/callback/gitlab",
        "600",
      ],
      passwords: [""],
      confirms: [true, true],
      selects: ["gitlab"],
    });

    const issues: ConfigValidationError[] = [{ field: "gitlab.host", message: "required", severity: "error" }];

    try {
      const result = await runSetupWizard({
        initialConfig: defaultConfig,
        issues,
        preferredTargetPath: targetPath,
        prompter,
        launchAuthFlow: false,
      });

      expect(result.status).toBe("completed");

      const stored = yaml.load(readFileSync(targetPath, "utf8")) as any;
      expect(stored.gitlab.host).toBe("https://gitlab.example.com");
      expect(stored.oauth2?.providers?.gitlab?.clientId).toBe("existing-client");
      expect(stored.oauth2?.providers?.gitlab?.clientSecret).toBe("existing-secret");
      expect(stored.oauth2?.providers?.gitlab?.authorizationUrl).toBe("https://gitlab.example.com/oauth/authorize");
      expect(stored.oauth2?.providers?.gitlab?.tokenUrl).toBe("https://gitlab.example.com/oauth/token");
      expect(stored.oauth2?.providers?.gitlab?.redirectUri).toBe("http://localhost:3000/callback");
      expect(stored.oauth2?.server?.port).toBe(4000);
      expect(stored.oauth2?.server?.callbackPath).toBe("/api/auth/oauth2/callback/gitlab");
      expect(stored.oauth2?.server?.timeout).toBe(600);

      expect(prompter.history).toEqual([
        { type: "input", message: "GitLab host URL" },
        { type: "confirm", message: "Configure OAuth2 client credentials now?" },
        { type: "select", message: "Which OAuth2 provider do you want to configure?" },
        { type: "input", message: "OAuth2 client ID" },
        { type: "password", message: "OAuth2 client secret (leave blank to keep current)" },
        { type: "input", message: "Authorization URL" },
        { type: "input", message: "Token URL" },
        { type: "input", message: "Scopes (comma-separated)" },
        { type: "input", message: "Redirect URI" },
        { type: "confirm", message: "Configure OAuth2 callback server settings now?" },
        { type: "input", message: "Callback port" },
        { type: "input", message: "Callback path" },
        { type: "input", message: "Timeout in seconds" },
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
