import { noCallThru } from "proxyquire";
import * as yaml from "js-yaml";

const mockParseYaml = (yamlStr: string) => {
  return yaml.load(yamlStr);
};

export const loadWithMockedObsidian = (modulePath: string) => {
  return noCallThru().load(modulePath, {
    obsidian: {
      parseYaml: mockParseYaml,
      "@global": true,
    },
  });
};
