import { noCallThru } from "proxyquire";
import { parse } from "yaml";

const mockParseYaml = (yamlStr: string) => {
  return parse(yamlStr);
};

export const loadWithMockedObsidian = (modulePath: string) => {
  return noCallThru().load(modulePath, {
    obsidian: {
      parseYaml: mockParseYaml,
      "@global": true,
    },
  });
};
