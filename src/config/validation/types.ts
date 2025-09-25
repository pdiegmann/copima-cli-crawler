export type ValidationResult = {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: string[];
};

export type ConfigValidationError = {
  field: string;
  message: string;
  value?: unknown;
  severity: "error" | "warning";
};

export type ValidationRule = {
  field: string;
  validate: (value: unknown) => ValidationResult;
  dependencies?: string[];
};

export type BaseValidator = {
  validate(config: Partial<any>): ValidationResult;
};
