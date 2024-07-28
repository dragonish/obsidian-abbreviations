interface WordItem {
  text: string;
  /** Is special or whitespace */
  isSpecial: boolean;
}

export interface AbbreviationInfo {
  key: string;
  title: string;
}

export type MetadataAbbrType = string | Record<string, unknown>;

export interface AbbrPluginSettings {
  metadataKeyword: string;
  globalAbbreviations: AbbreviationInfo[];
}

export interface AbbrPluginData extends AbbrPluginSettings {
  frontmatterCache?: Record<string, unknown>;
}

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
 * @param char
 * @returns `true` if it is a a special character or a whitespace character
 */
export function isSpecialOrWhitespace(char: string) {
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
 * Get abbreviation info.
 * @param input
 * @returns
 */
export function getAbbreviationInfo(
  input: MetadataAbbrType
): AbbreviationInfo | null {
  if (typeof input === "string") {
    const val = input.trim();
    const index = val.indexOf(":");
    if (index > 0) {
      return {
        key: val.substring(0, index).trim(),
        title: val.substring(index + 1).trim(),
      };
    }
  } else if (typeof input === "object" && input) {
    const keys = Object.keys(input);
    if (keys.length === 1 && typeof input[keys[0]] === "string") {
      return {
        key: keys[0],
        title: input[keys[0]] as string,
      };
    }
  }

  return null;
}

/**
 * Query title for abbreviations.
 * @param text
 * @param abbrList
 * @returns the abbreviation title. *An empty string indicates that the abbreviation is disabled*
 */
export function queryAbbreviationTitle(
  text: string,
  abbrList: AbbreviationInfo[]
) {
  for (let i = abbrList.length - 1; i >= 0; i--) {
    if (text === abbrList[i].key) {
      return abbrList[i].title;
    }
  }
  return null;
}

/**
 * Determines whether the abbreviation list is empty.
 * - If the `title` is empty, the abbreviation is considered disabled.
 * @param abbr
 * @returns `true` if empty
 */
export function isAbbreviationsEmpty(abbr: AbbreviationInfo[]): boolean {
  if (abbr.length === 0) {
    return true;
  }

  const tempSet = new Set<string>();
  for (const item of abbr) {
    if (item.title) {
      tempSet.add(item.key);
    } else {
      tempSet.delete(item.key);
    }
  }

  return tempSet.size === 0;
}

/**
 * Calculate abbreviations.
 * @param frontmatter
 * @param keyword
 * @returns
 */
export function calcAbbrList(
  frontmatter?: Record<string, unknown>,
  keyword?: string
): AbbreviationInfo[] {
  const abbrList: AbbreviationInfo[] = [];
  if (
    keyword &&
    frontmatter &&
    typeof frontmatter === "object" &&
    frontmatter
  ) {
    if (Array.isArray(frontmatter[keyword])) {
      const list = frontmatter[keyword] as MetadataAbbrType[];
      list.forEach((item) => {
        const abbrInfo = getAbbreviationInfo(item);
        abbrInfo && abbrList.push(abbrInfo);
      });
    }
  }
  return abbrList;
}
