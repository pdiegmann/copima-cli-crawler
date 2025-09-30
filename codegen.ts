import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "https://gitlab.com/api/graphql",
  documents: "src/api/**/*",
  hooks: { afterOneFileWrite: ["eslint --fix", "prettier --write"] },
  config: { namingConvention: "keep" },
  emitLegacyCommonJSImports: false,
  allowPartialOutputs: true,
  generates: {
    "src/api/gql/": {
      preset: "client",
      plugins: [],
    },
    "./graphql.schema.json": {
      plugins: ["introspection"],
    },
  },
};

export default config;
