const { readFileSync } = require("node:fs");

function readVersion() {
  return JSON.parse(readFileSync("manifest.json", "utf8")).version;
}

function writeVersion(contents, newVersion) {
  const { minAppVersion } = JSON.parse(readFileSync("manifest.json", "utf8"));
  const versions = JSON.parse(contents);
  if (!versions[newVersion]) {
    versions[newVersion] = minAppVersion;
  }
  return JSON.stringify(versions, null, "\t");
}

module.exports = { readVersion, writeVersion };
