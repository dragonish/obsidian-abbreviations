import type {
  TextItem,
  MarkItem,
  AbbreviationInfo,
  AbbreviationInstance,
} from "./data";

type MetadataAbbrType = string | Record<string, unknown>;
type OverlapState =
  | "intersection"
  | "contain"
  | "included"
  | "same"
  | "unrelated";

interface WordItem {
  text: string;
  /** Is special or whitespace */
  isSpecial: boolean;
}

interface QueryItem extends MarkItem {
  abbrPos: number;
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
 * Find all indexes.
 * @param str
 * @param word
 * @returns
 */
export function findAllIndexes(str: string, word: string): number[] {
  if (word.length === 0) {
    return [];
  }

  const indexes: number[] = [];
  let startIndex = 0;

  while (startIndex < str.length) {
    const index = str.indexOf(word, startIndex);
    if (index === -1) {
      break;
    }
    indexes.push(index);
    startIndex = index + 1;
  }

  return indexes;
}

/**
 * Query overlap between two items.
 * @param left
 * @param right
 * @returns `"contain"` when left element contains right element.
 */
export function queryOverlap(left: TextItem, right: TextItem): OverlapState {
  const leftStart = left.index;
  const leftEnd = left.index + left.text.length;
  const rightStart = right.index;
  const rightEnd = right.index + right.text.length;

  if (leftStart === rightStart && leftEnd === rightEnd) {
    return "same";
  } else if (leftStart <= rightStart && leftEnd >= rightEnd) {
    return "contain";
  } else if (leftStart >= rightStart && leftEnd <= rightEnd) {
    return "included";
  } else if (leftEnd > rightStart && leftStart < rightEnd) {
    return "intersection";
  }
  return "unrelated";
}

/**
 * Gets a list of non-overlapping items.
 * @param list
 * @returns
 */
export function selectNonOverlappingItems(list: QueryItem[]): MarkItem[] {
  const res: MarkItem[] = [];

  if (list.length === 0) {
    return [];
  }

  const highestPriorityIndex = list.reduce(
    (lastIndex, element, currentIndex) => {
      if (element.abbrPos < 0) {
        return currentIndex;
      }
      return lastIndex;
    },
    0
  );

  for (let i = highestPriorityIndex; i >= 0; i--) {
    let add = true;
    for (const resItem of res) {
      const overlapState = queryOverlap(resItem, list[i]);

      if (overlapState !== "unrelated") {
        add = false;
        break;
      }
    }

    if (add) {
      res.push({
        index: list[i].index,
        text: list[i].text,
        title: list[i].title,
      });
    }
  }

  for (let j = highestPriorityIndex + 1; j < list.length; j++) {
    let add = true;
    for (const resItem of res) {
      const overlapState = queryOverlap(resItem, list[j]);

      if (overlapState !== "unrelated") {
        add = false;
        break;
      }
    }

    if (add) {
      res.push({
        index: list[j].index,
        text: list[j].text,
        title: list[j].title,
      });
    }
  }

  return res;
}

/**
 * Query title for abbreviations.
 * @param text
 * @param abbrList
 * @param lineStart
 * @param affixList
 * @param detectCJK
 * @returns the abbreviation title. *An empty string indicates that the abbreviation is disabled*
 */
export function queryAbbreviationTitle(
  text: string,
  abbrList: AbbreviationInstance[],
  lineStart = 1,
  affixList: string[] = [],
  detectCJK = false
): string | MarkItem[] {
  let fullRes: string | null = null;
  let affixFullRes: string | null = null;
  let cjkRes: QueryItem[] = [];

  let detectAffixes = affixList.length > 0;

  for (let i = abbrList.length - 1; i >= 0; i--) {
    const abbr = abbrList[i];
    if (!abbr.key) {
      continue;
    }

    if (text === abbr.key) {
      fullRes = abbr.title;
      if (abbr.type === "extra") {
        if (abbr.position <= lineStart) {
          break;
        }
      } else {
        break;
      }
    } else {
      if (detectAffixes) {
        let affixMatch = false;
        for (const affix of affixList) {
          if (text === abbr.key + affix) {
            affixFullRes = abbr.title;
            affixMatch = true;
            break;
          }
        }

        if (affixMatch) {
          if (abbr.type === "extra") {
            if (abbr.position <= lineStart) {
              detectAffixes = false;
            }
          } else {
            detectAffixes = false;
          }
        }
      }

      if (detectCJK && fullRes == null && affixFullRes == null) {
        const indexes = findAllIndexes(text, abbr.key);
        for (const index of indexes) {
          let add = true;
          cjkRes = cjkRes.filter((item) => {
            const overlapState = queryOverlap(item, {
              index,
              text: abbr.key,
            });

            if (overlapState === "same") {
              if (item.abbrPos > 0) {
                return false;
              } else {
                add = false;
              }
            } else if (overlapState === "included") {
              return false;
            } else if (overlapState === "contain") {
              add = false;
            }

            return true;
          });

          if (add) {
            cjkRes.push({
              index,
              text: abbr.key,
              title: abbr.title,
              abbrPos: abbr.type === "extra" ? abbr.position - lineStart : -1,
            });
          }
        }
      }
    }
  }

  if (fullRes != null) {
    return fullRes;
  } else if (affixFullRes != null) {
    return affixFullRes;
  } else if (cjkRes.length > 0) {
    const res = selectNonOverlappingItems(cjkRes)
      .filter((item) => item.title)
      .sort((a, b) => a.index - b.index);
    return res.length > 0 ? res : "";
  }

  return "";
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
    if (!item.key) {
      continue;
    }

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

/**
 * Find index of abbreviation from frontmatter.
 * @param abbr
 * @param frontmatter
 * @param keyword
 * @returns `-1` means not found.
 */
export function findAbbrIndexFromFrontmatter(
  abbr: AbbreviationInstance,
  frontmatter: Record<string, unknown>,
  keyword: string
): number {
  if (Array.isArray(frontmatter[keyword])) {
    const list = frontmatter[keyword] as MetadataAbbrType[];
    let index = list.length - 1;
    while (index >= 0) {
      const item = getAbbreviationInstance(list[index]);
      if (item && item.key === abbr.key && item.title === abbr.title) {
        break;
      }
      index--;
    }
    return index;
  }
  return -1;
}

/**
 * Find index of abbreviation from global abbreviations.
 * @param abbr
 * @param globalAbbreviations
 * @returns `-1` means not found.
 */
export function findAbbrIndexFromGlobal(
  abbr: AbbreviationInstance,
  globalAbbreviations: AbbreviationInfo[]
): number {
  let index = globalAbbreviations.length - 1;
  while (index >= 0) {
    const item = globalAbbreviations[index];
    if (item && item.key === abbr.key && item.title === abbr.title) {
      break;
    }
    index--;
  }
  return index;
}
