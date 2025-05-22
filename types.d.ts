interface AbbreviationInfo {
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

type AbbreviationInstance =
  | ExtraAbbreviationInstance
  | OtherAbbreviationInstance;

type SpecialState = "" | "metadata" | "codeBlocks" | "math";

interface Quotes {
  level: number;
}

interface CodeBlocks {
  graveCount: number;
}

interface TextItem {
  index: number;
  text: string;
}

interface MarkItem extends TextItem {
  title: string;
}

type OpacityOptions = 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

interface AbbrPluginSettings {
  metadataKeyword: string;
  detectCJK: boolean;
  detectAffixes: boolean;
  affixes: string;
  markInSourceMode: boolean;
  globalAbbreviations: AbbreviationInfo[];

  useMarkdownExtraSyntax: boolean;
  useExtraDefinitionDecorator: boolean;
  extraDefinitionDecoratorOpacity: OpacityOptions;
  extraDefinitionDecoratorContent: string;
}

interface AbbrPluginData
  extends Omit<AbbrPluginSettings, "detectAffixes" | "affixes"> {
  frontmatterCache?: Record<string, unknown>;
  suffixes?: string[];
}
