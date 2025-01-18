import type { AbbreviationInfo, AbbreviationInstance } from "./data";

interface WordItem {
  text: string;
  /** Is special or whitespace */
  isSpecial: boolean;
}

type MetadataAbbrType = string | Record<string, unknown>;

/**
 * Detects whether it is a whitespace character.
 * @param char
 * @returns `true` if it is a a special character
 */
export function isWhitespace(char: string) {
  return /\s/.test(char);
}

/**
 * Detects whether it is a special or a whitespace character.
 * - `-` and `&` not considered a special character
 * @param char
 * @returns `true` if it is a a special character or a whitespace character
 */
export function isSpecialOrWhitespace(char: string) {
  //! `-` and `&` not considered a special character
  if ("-" === char || "&" === char) {
    return false;
  }

  // Check for whitespace characters
  if (/\s/.test(char)) {
    return true;
  }

  // Check for letters, numbers, CJK characters
  if (/^[\p{L}\p{N}\p{Ideographic}]$/u.test(char)) {
    return false;
  }

  // If it is not of the above categories, it is considered a special character
  return true;
}

/**
 * Determine if the text is a word or content.
 * - Empty string is considered content.
 * @param text
 * @returns `true` if the text is a word
 */
export function isWord(text: string) {
  if (text === "") {
    return false;
  }

  for (const ch of text) {
    if (isSpecialOrWhitespace(ch)) {
      return false;
    }
  }
  return true;
}

/**
 * Gets the number of a single specified character in a source.
 * @param source
 * @param character
 * @returns
 */
export function findCharCount(source: string, character: string): number {
  if (source && character) {
    return source.split(character).length - 1;
  }
  return 0;
}

/**
 * Get words.
 * @param text
 * @returns
 */
export function getWords(text: string) {
  const result: WordItem[] = [];
  let index = 0,
    lastState = true,
    tempStr = "";

  for (const char of text) {
    const state = isSpecialOrWhitespace(char);
    if (index === 0) {
      ++index;
      lastState = state;
      tempStr += char;
    } else if (lastState === state) {
      tempStr += char;
    } else {
      result.push({
        text: tempStr,
        isSpecial: lastState,
      });
      lastState = state;
      tempStr = char;
      ++index;
    }
  }

  if (tempStr) {
    result.push({
      text: tempStr,
      isSpecial: lastState,
    });
  }

  return result;
}

/**
 * Parse the Abbreviation of the extra syntax.
 * @param line
 * @returns
 */
export function parseExtraAbbreviation(line: string): AbbreviationInfo | null {
  const matches = line.match(/^\*\[([^[\]]+?)\]:(\s+.*)?$/);
  if (matches) {
    return {
      key: matches[1],
      title: (matches[2] || "").trim(),
    };
  }

  return null;
}

/**
 * Determine if it is an abbreviation definition area.
 * @param text
 * @returns
 */
export function isExtraDefinitions(text: string): boolean {
  const lines = text.split("\n");
  let counter = 0;

  for (const line of lines) {
    if (line.match(/^\*\[[^[\]]+?\]:(\s+.*)?$/)) {
      counter = 0;
      continue;
    } else if (line.match(/^\[[^[\]]+?\]:(\s+.*)?$/)) {
      if (counter === 0) {
        counter = 1;
        continue;
      } else {
        counter = 0;
      }
    } else {
      return false;
    }
  }

  return counter === 0;
}

/**
 * Get affix list.
 * @param affixes
 * @returns
 */
export function getAffixList(affixes: string): string[] {
  return Array.from(
    new Set(
      affixes
        .split(",")
        .map((affix) => affix.trim())
        .filter((item) => item)
    )
  );
}

/**
 * Get abbreviation instance.
 * @param input
 * @returns
 */
export function getAbbreviationInstance(
  input: MetadataAbbrType
): AbbreviationInstance | null {
  if (typeof input === "string") {
    const val = input.trim();
    const index = val.indexOf(":");
    if (index > 0) {
      return {
        key: val.substring(0, index).trim(),
        title: val.substring(index + 1).trim(),
        type: "metadata",
      };
    }
  } else if (typeof input === "object" && input) {
    const keys = Object.keys(input);
    if (keys.length === 1 && typeof input[keys[0]] === "string") {
      return {
        key: keys[0],
        title: input[keys[0]] as string,
        type: "metadata",
      };
    }
  }

  return null;
}

/**
 * Query title for abbreviations.
 * @param text
 * @param abbrList
 * @param lineStart
 * @param affixList
 * @returns the abbreviation title. *An empty string indicates that the abbreviation is disabled*
 */
export function queryAbbreviationTitle(
  text: string,
  abbrList: AbbreviationInstance[],
  lineStart = 1,
  affixList: string[] = []
) {
  let res: string | null = null;
  let affixRes: string | null = null;
  let detectAffixes = affixList.length > 0;

  for (let i = abbrList.length - 1; i >= 0; i--) {
    const abbr = abbrList[i];
    if (text === abbr.key) {
      res = abbr.title;
      if (abbr.type === "extra") {
        if (abbr.position <= lineStart) {
          break;
        }
      } else {
        break;
      }
    } else if (detectAffixes) {
      let match = false;
      for (const affix of affixList) {
        if (text === abbr.key + affix) {
          affixRes = abbr.title;
          match = true;
          break;
        }
      }

      if (match) {
        if (abbr.type === "extra") {
          if (abbr.position <= lineStart) {
            detectAffixes = false;
          }
        } else {
          detectAffixes = false;
        }
      }
    }
  }

  return res ?? affixRes;
}

/**
 * Determines whether the abbreviation list is empty.
 * - If the `title` is empty, the abbreviation is considered disabled.
 * @param abbr
 * @returns `true` if empty
 */
export function isAbbreviationsEmpty(abbr: AbbreviationInstance[]): boolean {
  if (abbr.length === 0) {
    return true;
  }

  const tempSet = new Set<string>();
  for (const item of abbr) {
    if (item.type === "extra") {
      return false;
    }

    if (item.title) {
      tempSet.add(item.key);
    } else {
      tempSet.delete(item.key);
    }
  }

  return tempSet.size === 0;
}

/**
 * Calculate abbreviations from frontmatter.
 * @param frontmatter
 * @param keyword
 * @returns
 */
export function calcAbbrListFromFrontmatter(
  frontmatter?: Record<string, unknown>,
  keyword?: string
): AbbreviationInstance[] {
  const abbrList: AbbreviationInstance[] = [];
  if (keyword && typeof frontmatter === "object" && frontmatter) {
    if (Array.isArray(frontmatter[keyword])) {
      const list = frontmatter[keyword] as MetadataAbbrType[];
      list.forEach((item) => {
        const abbrInfo = getAbbreviationInstance(item);
        abbrInfo && abbrList.push(abbrInfo);
      });
    }
  }
  return abbrList;
}
