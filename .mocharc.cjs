module.exports = {
  ui: "bdd",
  spec: [
    "test/common/tool.spec.ts",
    "test/common/mark.spec.ts",
    "test/common/parser.spec.ts",
    "test/common/conversion.spec.ts",
    "test/**/**.spec.ts",
  ],
  import: "tsx",
};
