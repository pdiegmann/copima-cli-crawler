import pluginJs from "@eslint/js";
import prettier from "eslint-plugin-prettier";
//import securityPlugin from 'eslint-plugin-security';
import stylistic from "@stylistic/eslint-plugin";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tsPlugin from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.spec.ts", "**/*.test.ts", "**/__tests__/**", "**/tests/**"],
  },
  pluginJs.configs.recommended,
  tsPlugin.configs.recommended,
  //securityPlugin.configs.recommended,

  {
    files: ["**/*.ts"],

    languageOptions: { globals: globals.node },

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

      // Stylistic
      "stylistic/semi": ["error", "always"],
      "stylistic/indent": ["error", 2],
      "stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: "avoidEscape" }],

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
        },
      ],

      // Unicorn
      "unicorn/empty-brace-spaces": "off",
      "unicorn/no-null": "off",
    },
  },
]);
