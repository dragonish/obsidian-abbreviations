export interface AbbreviationInfo {
  key: string;
  title: string;
}

type AbbrInstanceType = "global" | "metadata" | "extra";

interface ExtraAbbreviationInstance extends AbbreviationInfo {
  type: "extra";
  position: number;
}

interface OtherAbbreviationInstance extends AbbreviationInfo {
  type: Exclude<AbbrInstanceType, "extra">;
  position?: number;
}

export type AbbreviationInstance =
  | ExtraAbbreviationInstance
  | OtherAbbreviationInstance;

export type SpecialState = "" | "metadata" | "codeBlocks" | "math";

export interface Quotes {
  level: number;
}

export interface CodeBlocks {
  graveCount: number;
}

export interface AbbrPluginSettings {
  useMarkdownExtraSyntax: boolean;
  metadataKeyword: string;
  detectAffixes: boolean;
  affixes: string;
  markInSourceMode: boolean;
  globalAbbreviations: AbbreviationInfo[];
}

export interface AbbrPluginData extends AbbrPluginSettings {
  frontmatterCache?: Record<string, unknown>;
}

export const abbrClassName = "abbreviations-plugin-abbr-element";

export const extraDefinitionClassName = "abbreviations-plugin-extra-definition";

export const extraAsteriskClassName = "abbreviations-plugin-extra-asterisk";

export const elementListSelector =
  "p, li, h1, h2, h3, h4, h5, h6, th, td, .table-cell-wrapper, .callout-title-inner";

export const METADATA_BORDER = "---";
