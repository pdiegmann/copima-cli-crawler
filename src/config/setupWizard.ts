import yaml from "js-yaml";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import pc from "picocolors";
import { getSupportedProviders } from "../auth/oauth2Providers.js";
import { createLogger } from "../logging/index.js";
import type { AuthCommandFlags } from "../types/commands.js";
import type { CliArgs, Config, OAuth2ProviderConfig } from "./types.js";
import type { ConfigValidationError } from "./validation/types.js";

export type WizardPrompter = {
  input(message: string, options?: PromptOptions): Promise<string>;
  password(message: string, options?: PromptOptions): Promise<string>;
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
  select(message: string, choices: ChoiceOption[], defaultValue?: string): Promise<string>;
  close(): Promise<void>;
};

export type PromptOptions = {
  defaultValue?: string;
  validate?: (value: string) => string | null;
  allowEmpty?: boolean;
};

export type ChoiceOption = {
  label: string;
  value: string;
};

type SetupWizardOptions = {
  initialConfig: Config;
  issues: ConfigValidationError[];
  preferredTargetPath?: string;
  prompter?: WizardPrompter;
  alwaysPromptCoreFields?: boolean;
  args?: CliArgs;
  launchAuthFlow?: boolean;
};

export type SetupWizardResult = {
  status: "completed" | "skipped" | "aborted";
  configPath?: string;
};

const LOCAL_CONFIG_CANDIDATES = ["./copima.yaml", "./copima.yml", "./.copima.yaml", "./copima.json"];
const GLOBAL_CONFIG_FILE = join(homedir(), ".config", "copima", "config.yaml");

const CORE_FIELDS = ["gitlab.host"] as const;

export class NodeWizardPrompter implements WizardPrompter {
  private readonly rl = createInterface({ input, output, terminal: true });
  private readonly isInteractive = Boolean(input.isTTY && output.isTTY);
  private closed = false;

  async input(message: string, options: PromptOptions = {}): Promise<string> {
    return this.ask(message, { ...options, mask: false });
  }

  async password(message: string, options: PromptOptions = {}): Promise<string> {
    return this.ask(message, { ...options, mask: true });
  }

  async confirm(message: string, defaultValue: boolean = true): Promise<boolean> {
    const suffix = defaultValue ? "[Y/n]" : "[y/N]";
    const answer = await this.ask(`${message} ${suffix}`, {
      defaultValue: defaultValue ? "y" : "n",
      allowEmpty: true,
      mask: false,
    });

    const normalized = answer.trim().toLowerCase();
    if (!normalized) {
      return defaultValue;
    }
    return ["y", "yes"].includes(normalized);
  }

  async select(message: string, choices: ChoiceOption[], defaultValue?: string): Promise<string> {
    if (choices.length === 0) {
      throw new Error("No choices provided to select from");
    }

    const columns = choices.map((choice, index) => `${pc.cyan(String(index + 1))}. ${choice.label}${defaultValue === choice.value ? pc.dim(" (default)") : ""}`).join("\n");

    output.write(`\n${message}\n${columns}\n`);

    const answer = await this.ask("Select option", {
      defaultValue: defaultValue ? String(choices.findIndex((choice) => choice.value === defaultValue) + 1) : undefined,
      allowEmpty: false,
      mask: false,
    });

    const numericIndex = Number.parseInt(answer, 10);
    if (!Number.isNaN(numericIndex) && numericIndex >= 1 && numericIndex <= choices.length) {
      return choices[numericIndex - 1]!.value;
    }

    const directMatch = choices.find((choice) => choice.value.toLowerCase() === answer.toLowerCase());
    if (directMatch) {
      return directMatch.value;
    }

    output.write(pc.red(`Invalid selection: ${answer}\n`));
    return this.select(message, choices, defaultValue);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.rl.close();
  }

  private async ask(message: string, options: PromptOptions & { mask?: boolean }): Promise<string> {
    this.ensureInteractive();
    const prompt = this.formatPrompt(message, options.defaultValue);
    const restoreMasking = this.applyMasking(options.mask);

    try {
      return await this.promptUntilValid(prompt, options);
    } finally {
      restoreMasking();
    }
  }

  private ensureInteractive(): void {
    if (!this.isInteractive) {
      throw new Error("Setup wizard requires an interactive terminal");
    }
  }

  private formatPrompt(message: string, defaultValue?: string): string {
    if (!defaultValue) {
      return `${message}: `;
    }
    const dimmedDefault = pc.dim(`(${defaultValue})`);
    return `${message} ${dimmedDefault}: `;
  }

  private applyMasking(mask?: boolean): () => void {
    if (!mask) {
      return () => {};
    }

    const originalWrite = (this.rl as any)._writeToOutput?.bind(this.rl);

    (this.rl as any)._writeToOutput = (text: string): void => {
      if (text.includes("\n") || text.includes("\r")) {
        output.write(text);
      } else {
        output.write("*".repeat(text.length));
      }
    };

    return () => {
      if (originalWrite) {
        (this.rl as any)._writeToOutput = originalWrite;
      }
    };
  }

  private normalizeAnswer(answer: string, defaultValue?: string): string {
    const trimmed = answer.trim();
    return trimmed === "" ? (defaultValue ?? "") : trimmed;
  }

  private validateResponse(value: string, options: PromptOptions): string | null {
    if (!value && options.allowEmpty === false) {
      return "Value is required.";
    }
    if (options.validate) {
      return options.validate(value);
    }
    return null;
  }

  private async promptUntilValid(prompt: string, options: PromptOptions & { mask?: boolean }): Promise<string> {
    while (true) {
      const rawAnswer = await this.rl.question(prompt);
      const value = this.normalizeAnswer(rawAnswer, options.defaultValue);
      const validationMessage = this.validateResponse(value, options);

      if (validationMessage) {
        output.write(pc.red(`${validationMessage}\n`));
        continue;
      }

      return value;
    }
  }
}

const loadExistingConfig = (filePath: string): Record<string, unknown> => {
  if (!existsSync(filePath)) {
    return {};
  }

  const raw = readFileSync(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    return JSON.parse(raw) as Record<string, unknown>;
  }
  return (yaml.load(raw) ?? {}) as Record<string, unknown>;
};

const writeConfigFile = (filePath: string, config: Record<string, unknown>): void => {
  mkdirSync(dirname(filePath), { recursive: true });
  if (filePath.endsWith(".json")) {
    writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  } else {
    writeFileSync(filePath, `${yaml.dump(config, { indent: 2 })}`, "utf8");
  }
};

const setNestedValue = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const keys = path.split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;

  let node: Record<string, unknown> = target;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(node, key) || typeof node[key] !== "object" || node[key] === null) {
      node[key] = {};
    }
    node = node[key] as Record<string, unknown>;
  }

  node[lastKey] = value;
};

const resolveConfigTarget = async (prompter: WizardPrompter, preferred?: string): Promise<string> => {
  if (preferred) {
    return resolve(preferred);
  }

  const existingLocal = LOCAL_CONFIG_CANDIDATES.map((candidate) => resolve(candidate)).find((candidate) => existsSync(candidate));
  const hasGlobal = existsSync(GLOBAL_CONFIG_FILE);

  if (existingLocal && hasGlobal) {
    const choice = await prompter.select(
      "Multiple configuration files detected. Choose which one to update:",
      [
        { label: `${existingLocal} (local)`, value: existingLocal },
        { label: `${GLOBAL_CONFIG_FILE} (global)`, value: GLOBAL_CONFIG_FILE },
      ],
      existingLocal
    );
    return choice;
  }

  if (existingLocal) {
    return existingLocal;
  }

  if (hasGlobal) {
    return GLOBAL_CONFIG_FILE;
  }

  const location = await prompter.select(
    "No configuration files found. Where should the wizard store your settings?",
    [
      { label: "Create local config in ./copima.yaml", value: resolve("./copima.yaml") },
      { label: `Create user-wide config in ${GLOBAL_CONFIG_FILE}`, value: GLOBAL_CONFIG_FILE },
    ],
    resolve("./copima.yaml")
  );

  return location;
};

const fieldValidators: Record<string, (value: string) => string | null> = {
  "gitlab.host": (value: string) => {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) {
        return "GitLab host must use http or https";
      }
      return null;
    } catch {
      return "Enter a valid URL";
    }
  },
  "database.path": (value: string) => {
    if (!value.trim()) {
      return "Database path cannot be empty";
    }
    return null;
  },
  "output.rootDir": (value: string) => {
    if (!value.trim()) {
      return "Output directory cannot be empty";
    }
    return null;
  },
  "logging.level": (value: string) => {
    const valid = ["error", "warn", "info", "debug"];
    if (!valid.includes(value as any)) {
      return `Choose one of: ${valid.join(", ")}`;
    }
    return null;
  },
};

const numberValidator = (min: number, max?: number) => {
  return (value: string): string | null => {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) {
      return "Enter a numeric value";
    }
    if (numeric < min) {
      return `Value must be >= ${min}`;
    }
    if (max !== undefined && numeric > max) {
      return `Value must be <= ${max}`;
    }
    return null;
  };
};

const FIELD_METADATA: Record<string, { message: string; type: "string" | "password" | "number" | "select" | "boolean"; choices?: ChoiceOption[]; min?: number; max?: number }> = {
  "gitlab.host": { message: "GitLab host URL", type: "string" },
  "gitlab.timeout": { message: "GitLab timeout (ms)", type: "number", min: 1000, max: 300000 },
  "gitlab.maxConcurrency": { message: "Max concurrent API requests", type: "number", min: 1, max: 100 },
  "gitlab.rateLimit": { message: "API rate limit (requests per minute)", type: "number", min: 1, max: 2000 },
  "database.path": { message: "SQLite database path", type: "string" },
  "database.timeout": { message: "Database timeout (ms)", type: "number", min: 1000, max: 60000 },
  "output.rootDir": { message: "Root directory for crawler output", type: "string" },
  "logging.level": {
    message: "Logging level",
    type: "select",
    choices: [
      { label: "error", value: "error" },
      { label: "warn", value: "warn" },
      { label: "info", value: "info" },
      { label: "debug", value: "debug" },
    ],
  },
};

const toNumber = (value: string): number => Number.parseInt(value, 10);

const parseScopes = (value: string): string[] =>
  value
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

const formatScopes = (scopes?: string[]): string | undefined => {
  if (!scopes || scopes.length === 0) {
    return undefined;
  }
  return scopes.join(",");
};

const promptClientSecret = async (prompter: WizardPrompter, existingSecret?: string): Promise<string> => {
  const allowReuse = Boolean(existingSecret);
  const message = allowReuse ? "OAuth2 client secret (leave blank to keep current)" : "OAuth2 client secret";

  const secret = await prompter.password(message, {
    allowEmpty: allowReuse,
    validate: (value) => {
      if (!value && !allowReuse) {
        return "Client secret is required.";
      }
      return null;
    },
  });

  if (!secret && allowReuse && existingSecret) {
    return existingSecret;
  }

  return secret;
};

const applyAnswer = (config: Record<string, unknown>, field: string, value: string): void => {
  const metadata = FIELD_METADATA[field];
  if (metadata?.type === "number") {
    setNestedValue(config, field, toNumber(value));
  } else if (metadata?.type === "select" || metadata?.type === "string") {
    setNestedValue(config, field, value);
  } else if (metadata?.type === "password") {
    setNestedValue(config, field, value);
  } else {
    setNestedValue(config, field, value);
  }
};

const deriveDefaultValue = (config: Config | Record<string, unknown>, field: string): string | undefined => {
  const segments = field.split(".");
  let cursor: any = config;
  for (const segment of segments) {
    cursor = cursor?.[segment];
    if (cursor === undefined || cursor === null) {
      return undefined;
    }
  }
  if (typeof cursor === "number") {
    return String(cursor);
  }
  if (typeof cursor === "string") {
    return cursor === "" ? undefined : cursor;
  }
  return undefined;
};

const gatherFieldsToPrompt = (issues: ConfigValidationError[], alwaysPromptCore: boolean): string[] => {
  const missingFields = new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.field));
  if (alwaysPromptCore) {
    for (const field of CORE_FIELDS) {
      missingFields.add(field);
    }
  }
  return Array.from(missingFields).filter((field) => field !== "gitlab.accessToken");
};

type FieldPromptMetadata = (typeof FIELD_METADATA)[keyof typeof FIELD_METADATA];

type FieldPromptContext = {
  prompter: WizardPrompter;
  fields: string[];
  initialConfig: Config;
  existingConfig: Record<string, unknown>;
};

type FieldPromptParams = {
  prompter: WizardPrompter;
  field: string;
  metadata?: FieldPromptMetadata;
  defaultValue?: string;
  validator?: (value: string) => string | null;
};

const buildFieldValidator = (field: string, metadata?: FieldPromptMetadata): ((value: string) => string | null) | undefined => {
  if (fieldValidators[field]) {
    return fieldValidators[field];
  }

  if (metadata?.type === "number" && metadata.min !== undefined) {
    return numberValidator(metadata.min, metadata.max);
  }

  return undefined;
};

const promptFieldValue = async ({ prompter, field, metadata, defaultValue, validator }: FieldPromptParams): Promise<string> => {
  if (metadata?.type === "select" && metadata.choices) {
    return prompter.select(metadata.message, metadata.choices, defaultValue);
  }

  if (metadata?.type === "number") {
    const effectiveValidator = validator ?? numberValidator(metadata.min ?? 0, metadata.max);
    return prompter.input(metadata.message, { defaultValue, validate: effectiveValidator });
  }

  if (metadata?.type === "password") {
    return prompter.password(metadata.message, {
      defaultValue,
      validate: validator,
      allowEmpty: false,
    });
  }

  const message = metadata?.message ?? field;
  return prompter.input(message, {
    defaultValue,
    validate: validator,
    allowEmpty: false,
  });
};

const promptConfigurationFields = async ({ prompter, fields, initialConfig, existingConfig }: FieldPromptContext): Promise<Record<string, unknown>> => {
  if (fields.length === 0) {
    return { ...existingConfig };
  }

  const mergedConfig: Record<string, unknown> = { ...existingConfig };

  for (const field of fields) {
    const metadata = FIELD_METADATA[field];
    const defaultValue = deriveDefaultValue(existingConfig, field) ?? deriveDefaultValue(initialConfig, field);
    const validator = buildFieldValidator(field, metadata);

    const value = await promptFieldValue({ prompter, field, metadata, defaultValue, validator });
    applyAnswer(mergedConfig, field, value);
  }

  return mergedConfig;
};

const maybeConfigureOAuthSetup = async (config: Record<string, unknown>, prompter: WizardPrompter): Promise<void> => {
  const existingOAuth = (config["oauth2"] as Record<string, unknown>) ?? {};
  const existingProviders = existingOAuth["providers"] as Record<string, unknown> | undefined;
  const hasExistingProviders = Boolean(existingProviders && Object.keys(existingProviders).length > 0);

  if (hasExistingProviders) {
    output.write(`${pc.dim("Existing OAuth2 settings detected; press enter to reuse saved values where available.")}\n`);
  }

  const wantsOAuth = await prompter.confirm("Configure OAuth2 client credentials now?", true);
  if (wantsOAuth) {
    await configureOAuth(config, prompter);
  }
};

const configureOAuth = async (config: Record<string, unknown>, prompter: WizardPrompter): Promise<void> => {
  const supportedProviders = getSupportedProviders();
  const oauthConfig = (config["oauth2"] as Record<string, unknown>) ?? {};
  const providerMap = (oauthConfig["providers"] as Record<string, OAuth2ProviderConfig>) ?? {};
  const existingProviderKeys = Object.keys(providerMap);

  const providerChoices: ChoiceOption[] = [
    ...supportedProviders.map((provider) => ({
      label: providerMap[provider] ? `${provider} (existing)` : provider,
      value: provider,
    })),
    ...existingProviderKeys.filter((key) => !supportedProviders.includes(key)).map((key) => ({ label: `${key} (existing)`, value: key })),
    { label: "Custom provider", value: "custom" },
  ];

  const defaultProviderChoice = determineDefaultProviderChoice(existingProviderKeys, supportedProviders);
  const selectedProvider = await prompter.select("Which OAuth2 provider do you want to configure?", providerChoices, defaultProviderChoice);

  const isKnownProvider = supportedProviders.includes(selectedProvider);
  const isNewCustomProvider = selectedProvider === "custom";
  const existingProviderConfig = isNewCustomProvider ? undefined : (providerMap[selectedProvider] as OAuth2ProviderConfig | undefined);
  const defaults = isKnownProvider ? providerDefaults(selectedProvider) : providerDefaults("custom");

  const clientId = await prompter.input("OAuth2 client ID", {
    allowEmpty: false,
    defaultValue: existingProviderConfig?.clientId,
  });

  const clientSecret = await promptClientSecret(prompter, existingProviderConfig?.clientSecret);

  const authorizationUrl = await prompter.input("Authorization URL", {
    allowEmpty: false,
    defaultValue: existingProviderConfig?.authorizationUrl ?? (isKnownProvider ? defaults.authorizationUrl : ""),
  });

  const tokenUrl = await prompter.input("Token URL", {
    allowEmpty: false,
    defaultValue: existingProviderConfig?.tokenUrl ?? (isKnownProvider ? defaults.tokenUrl : ""),
  });

  const scopesAnswer = await prompter.input("Scopes (comma-separated)", {
    defaultValue: formatScopes(existingProviderConfig?.scopes) ?? formatScopes(defaults.scopes),
    allowEmpty: true,
  });

  const redirectUri = await prompter.input("Redirect URI", {
    defaultValue: existingProviderConfig?.redirectUri ?? "http://localhost:3000/callback",
    allowEmpty: false,
  });

  const providerConfig: OAuth2ProviderConfig = {
    clientId,
    clientSecret,
    authorizationUrl,
    tokenUrl,
    redirectUri,
    scopes: parseScopes(scopesAnswer),
  };

  let providerKey = selectedProvider;
  if (isNewCustomProvider) {
    providerKey = providerConfig.authorizationUrl || "custom";
  }

  providerMap[providerKey] = providerConfig;
  oauthConfig["providers"] = providerMap;

  const existingServerConfig = oauthConfig["server"] as { port?: number; callbackPath?: string; timeout?: number } | undefined;
  const configureServer = await prompter.confirm("Configure OAuth2 callback server settings now?", Boolean(existingServerConfig));
  if (configureServer) {
    const port = await prompter.input("Callback port", {
      defaultValue: String(existingServerConfig?.port ?? 3000),
      validate: numberValidator(1, 65535),
    });
    const callbackPath = await prompter.input("Callback path", {
      defaultValue: existingServerConfig?.callbackPath ?? "/callback",
    });
    const timeout = await prompter.input("Timeout in seconds", {
      defaultValue: String(existingServerConfig?.timeout ?? 300),
      validate: numberValidator(1),
    });

    oauthConfig["server"] = {
      port: Number.parseInt(port, 10),
      callbackPath,
      timeout: Number.parseInt(timeout, 10),
    };
  }

  config["oauth2"] = oauthConfig;
};

const providerDefaults = (provider: string): { authorizationUrl: string; tokenUrl: string; scopes: string[] } => {
  switch (provider.toLowerCase()) {
    case "gitlab":
      return {
        authorizationUrl: "https://gitlab.com/oauth/authorize",
        tokenUrl: "https://gitlab.com/oauth/token",
        scopes: ["api", "read_user"],
      };
    case "github":
      return {
        authorizationUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        scopes: ["repo", "user"],
      };
    default:
      return {
        authorizationUrl: "",
        tokenUrl: "",
        scopes: ["api"],
      };
  }
};

const determineDefaultProviderChoice = (existingKeys: string[], supportedProviders: string[]): string | undefined => {
  const matchingSupported = supportedProviders.find((provider) => existingKeys.includes(provider));
  if (matchingSupported) {
    return matchingSupported;
  }

  if (existingKeys.length > 0) {
    return existingKeys[0];
  }

  return supportedProviders[0];
};

const resolveAuthProviderKey = (config: Record<string, unknown>, providers: Record<string, OAuth2ProviderConfig>): string | undefined => {
  const authSection = config["auth"];
  if (authSection && typeof authSection === "object") {
    const oauthSection = (authSection as Record<string, unknown>)["oauth2"];
    if (oauthSection && typeof oauthSection === "object") {
      const defaultProvider = (oauthSection as Record<string, unknown>)["defaultProvider"];
      if (typeof defaultProvider === "string" && providers[defaultProvider]) {
        return defaultProvider;
      }
    }
  }

  if (providers["gitlab"]) {
    return "gitlab";
  }

  const keys = Object.keys(providers);
  return keys[0];
};

const maybeLaunchAuthFlow = async (targetPath: string, config: Record<string, unknown>, options: SetupWizardOptions): Promise<void> => {
  if (options.launchAuthFlow === false) {
    return;
  }

  const oauthSection = config["oauth2"];
  if (!oauthSection || typeof oauthSection !== "object") {
    output.write(`${pc.dim("Skipped automatic authentication: no OAuth2 providers configured yet.")}\n`);
    return;
  }

  const providerMap = (oauthSection as Record<string, unknown>)["providers"] as Record<string, OAuth2ProviderConfig> | undefined;
  if (!providerMap || Object.keys(providerMap).length === 0) {
    output.write(`${pc.dim("Skipped automatic authentication: no OAuth2 providers configured yet.")}\n`);
    return;
  }

  const providerKey = resolveAuthProviderKey(config, providerMap);
  if (!providerKey) {
    output.write(`${pc.dim("Skipped automatic authentication: unable to determine a provider to authenticate.")}\n`);
    return;
  }

  const providerConfig = providerMap[providerKey];
  output.write(`${pc.cyan("➡ Starting OAuth2 authentication flow to finish setup...")}\n`);

  const { executeAuthFlow } = await import("../commands/auth/impl.js");
  const authFlags: AuthCommandFlags = {
    provider: providerKey,
    config: targetPath,
  };

  if (providerConfig?.redirectUri) {
    authFlags["redirect-uri"] = providerConfig.redirectUri;
  }

  const gitlabSection = config["gitlab"];
  if (gitlabSection && typeof gitlabSection === "object") {
    const accountId = (gitlabSection as Record<string, unknown>)["accountId"];
    if (typeof accountId === "string") {
      authFlags["account-id"] = accountId;
    }

    const email = (gitlabSection as Record<string, unknown>)["email"];
    if (typeof email === "string") {
      authFlags.email = email;
    }
  }

  await executeAuthFlow(authFlags);
};

export const runSetupWizard = async (options: SetupWizardOptions): Promise<SetupWizardResult> => {
  const logger = createLogger("SetupWizard");
  const prompter = options.prompter ?? new NodeWizardPrompter();
  const managePrompterLifecycle = !options.prompter;

  try {
    output.write(`\n${pc.bold(pc.green("Copima CLI setup wizard"))}\n`);
    output.write(`${pc.dim("We will collect only the values that are still missing or incomplete.")}\n`);
    output.write(`${pc.dim("Static personal access tokens are no longer required—set up OAuth2 to authenticate securely.")}\n\n`);

    const targetPath = await resolveConfigTarget(prompter, options.preferredTargetPath);
    const existingConfig = loadExistingConfig(targetPath);
    const fieldsToPrompt = gatherFieldsToPrompt(options.issues, Boolean(options.alwaysPromptCoreFields));

    const mergedConfig = await promptConfigurationFields({
      prompter,
      fields: fieldsToPrompt,
      initialConfig: options.initialConfig,
      existingConfig,
    });

    await maybeConfigureOAuthSetup(mergedConfig, prompter);

    writeConfigFile(targetPath, mergedConfig);

    output.write(`\n${pc.green("✔ Configuration saved!")} ${pc.dim(targetPath)}\n`);
    logger.info("Configuration updated via setup wizard", { targetPath });

    await maybeLaunchAuthFlow(targetPath, mergedConfig, options);

    return { status: "completed", configPath: targetPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ERR_CANCELED") {
      output.write(`\n${pc.yellow("Setup wizard aborted by user.")}\n`);
      return { status: "aborted" };
    }
    throw error;
  } finally {
    if (managePrompterLifecycle) {
      await prompter.close();
    }
  }
};
