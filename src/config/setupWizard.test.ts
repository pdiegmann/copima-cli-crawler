import { describe, expect, it } from "@jest/globals";
import { mkdtempSync, readFileSync, rmSync } from "fs";
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
      inputs: ["https://gitlab.example.com"],
      passwords: ["tokenvaluewithlength1234567890"],
      confirms: [false],
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
      });

      expect(result.status).toBe("completed");

      const stored = yaml.load(readFileSync(targetPath, "utf8")) as any;
      expect(stored.gitlab.host).toBe("https://gitlab.example.com");
      expect(stored.gitlab.accessToken).toBe("tokenvaluewithlength1234567890");

      expect(prompter.history).toEqual([
        { type: "input", message: "GitLab host URL" },
        { type: "password", message: "GitLab access token" },
        { type: "confirm", message: "Configure OAuth2 client credentials now?" },
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
