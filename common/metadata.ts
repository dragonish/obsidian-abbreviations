import * as yaml from "js-yaml";

function toMetadata(input: unknown) {
  if (typeof input === "object" && input) {
    return input as Record<string, unknown>;
  }
  return null;
}

function jsonParser(text: string) {
  try {
    const jsonObj = JSON.parse(text);
    return toMetadata(jsonObj);
  } catch {
    return null;
  }
}

function yamlParser(text: string) {
  try {
    const yamlObj = yaml.load(text);
    return toMetadata(yamlObj);
  } catch {
    return null;
  }
}

export function getMetadata(text: string) {
  let res = yamlParser(text);
  if (res === null) {
    res = jsonParser(text);
  }
  return res;
}
