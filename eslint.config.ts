import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.spec.ts", "**/*.test.ts", "**/__tests__/**", "**/tests/**"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  sonarjs.configs.recommended,

  {
    files: ["**/*.ts"],

    languageOptions: {
      globals: globals.node,
      parser: tsParser,
    },

    plugins: {
      prettier,
      unicorn,
      stylistic,
    },

    rules: {
      "func-style": ["error", "expression"],
      "no-restricted-syntax": ["off", "ForOfStatement"],
      "no-console": ["off"],
      "prefer-template": "error",

      // TypeScript
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      // Prettier
      "prettier/prettier": [
        1,
        {
          endOfLine: "lf",
          printWidth: 180,
          semi: true,
          singleQuote: false,
          tabWidth: 2,
          trailingComma: "es5",
          bracketSameLine: true,
        },
      ],

      // Disable stylistic rules that conflict with Prettier
      "stylistic/indent": "off",
      "stylistic/semi": "off",
      "stylistic/quotes": "off",

      // Unicorn
      "unicorn/empty-brace-spaces": "off",
      "unicorn/no-null": "off",
    },
  },
]);
