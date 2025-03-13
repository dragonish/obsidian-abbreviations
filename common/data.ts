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

export interface TextItem {
  index: number;
  text: string;
}

export interface MarkItem extends TextItem {
  title: string;
}

export interface AbbrPluginSettings {
  useMarkdownExtraSyntax: boolean;
  metadataKeyword: string;
  detectCJK: boolean;
  detectAffixes: boolean;
  affixes: string;
  markInSourceMode: boolean;
  globalAbbreviations: AbbreviationInfo[];
}

export interface AbbrPluginData
  extends Omit<AbbrPluginSettings, "detectAffixes" | "affixes"> {
  frontmatterCache?: Record<string, unknown>;
  suffixes?: string[];
}

export const abbrClassName = "abbreviations-plugin-abbr-element";

export const extraDefinitionClassName = "abbreviations-plugin-extra-definition";

export const extraAsteriskClassName = "abbreviations-plugin-extra-asterisk";

export const extraDefinitionLineClassName =
  "abbreviations-plugin-extra-definition-line";

export const elementListSelector =
  "p, li, h1, h2, h3, h4, h5, h6, th, td, .table-cell-wrapper, .callout-title-inner";

export const METADATA_BORDER = "---";
