module.exports = {
  ui: "bdd",
  spec: [
    "test/utils/tool.spec.ts",
    "test/utils/mark.spec.ts",
    "test/utils/metadata.spec.ts",
    "test/utils/parser.spec.ts",
    "test/utils/conversion.spec.ts",
    "test/**/**.spec.ts",
  ],
  import: "tsx",
};
