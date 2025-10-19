import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "schema.graphql",
  documents: "src/api/queries/**/*.graphql",
  hooks: {},
  config: {
    namingConvention: "keep",
    useTypeImports: true,
  },
  emitLegacyCommonJSImports: false,
  allowPartialOutputs: true,
  generates: {
    "src/api/gql/": {
      preset: "client",
      plugins: [],
      config: {
        useTypeImports: true,
      },
    },
    "./graphql.schema.json": {
      plugins: ["introspection"],
    },
  },
};

export default config;
