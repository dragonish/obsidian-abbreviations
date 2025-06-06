import { METADATA_BORDER } from "./data";
import { Base } from "./base";
import {
  findCharCount,
  calcAbbrListFromFrontmatter,
  parseExtraAbbreviation,
  isAbbreviationsEmpty,
} from "./tool";
import { getMetadata } from "./metadata";

interface ParseOption {
  metadata?: boolean;
  extra?: boolean;
}

export class Parser extends Base {
  abbreviations: AbbreviationInstance[];

  private abbreviationKeyword: string;
  private parseOption: ParseOption;
  private metadataBuffer: string[];

  constructor(
    abbreviations: AbbreviationInfo[],
    abbreviationKeyword: string,
    parseOption: ParseOption
  ) {
    super();

    this.abbreviations = abbreviations
      .map<AbbreviationInstance>(({ key, title }) => ({
        key,
        title,
        type: "global",
      }))
      .filter((item) => item.key);

    this.abbreviationKeyword = abbreviationKeyword;
    this.parseOption = parseOption;
    this.metadataBuffer = [];
  }

  /**
   * Read abbreviations from frontmatter cache.
   * @param frontmatterCache
   */
  readAbbreviationsFromCache(frontmatterCache?: Record<string, unknown>) {
    const list = calcAbbrListFromFrontmatter(
      frontmatterCache,
      this.abbreviationKeyword
    );
    this.abbreviations.push(...list);
  }

  /**
   * Determines whether the abbreviation list is empty.
   * @returns `true` if empty
   */
  isAbbreviationsEmpty() {
    return isAbbreviationsEmpty(this.abbreviations);
  }

  /**
   * Line content handler.
   * - Do not process Properties(Metadata), Code blocks, Math
   * - Process comments
   * @param text
   * @param lineStart
   */
  handler(text: string, lineStart: number): void {
    if (lineStart === 1 && text === METADATA_BORDER) {
      this.state = "metadata";
      return;
    }

    if (this.quotes.level > 0) {
      if (this.state !== "math" && text.trim().length === 0) {
        //! empty line
        this.state = "";
        this.codeBlocks.graveCount = 0;
        this.quotes.level = 0;
        return;
      }
    }

    if (this.state === "") {
      if (/^(?:[ ]{4,}|\t|[> ]+(?:[ ]{5,}|\t))/.test(text)) {
        // pure code blocks
        return;
      }

      const codeBlocks = text.match(/^([> ]*`{3,})[^`]*$/);
      if (codeBlocks) {
        this.state = "codeBlocks";
        this.codeBlocks.graveCount = findCharCount(codeBlocks[1], "`");
        this.quotes.level = findCharCount(codeBlocks[1], ">");
        return;
      }

      const math = text.match(/^([> ]*)\$\$(.*)/);
      if (math && !math[2].trim().endsWith("$$")) {
        this.state = "math";
        this.quotes.level = findCharCount(math[1], ">");
        return;
      }

      if (this.parseOption.extra) {
        const parseRes = parseExtraAbbreviation(text);
        if (parseRes) {
          this.abbreviations.push({
            key: parseRes.key,
            title: parseRes.title,
            type: "extra",
            position: lineStart,
          });
        }
      }
    } else {
      if (this.state === "metadata") {
        if (text === METADATA_BORDER) {
          if (
            this.parseOption.metadata &&
            this.abbreviationKeyword &&
            this.metadataBuffer.length > 0
          ) {
            //* Calculate abbreviations
            const metadata = getMetadata(this.metadataBuffer.join("\n"));
            if (metadata) {
              const list = calcAbbrListFromFrontmatter(
                metadata,
                this.abbreviationKeyword
              );
              this.abbreviations.push(...list);
            }
          }
          this.state = "";
        } else if (this.parseOption.metadata && this.abbreviationKeyword) {
          this.metadataBuffer.push(text);
        }
      } else if (this.state === "codeBlocks") {
        const endCodeBlocks = text.match(/^([> ]*`{3,})([^`]*)$/);
        if (endCodeBlocks) {
          const level = findCharCount(endCodeBlocks[1], ">");
          const graveCount = findCharCount(endCodeBlocks[1], "`");

          if (level < this.quotes.level) {
            this.quotes.level = level;
            this.codeBlocks.graveCount = graveCount;
          } else if (
            level === this.quotes.level &&
            graveCount >= this.codeBlocks.graveCount &&
            endCodeBlocks[2].trim().length === 0
          ) {
            this.state = "";
          }
        }
      } else if (this.state === "math") {
        const endMath = text.match(/^([> ]*)\$\$/);
        if (endMath) {
          const level = findCharCount(endMath[1], ">");

          if (level < this.quotes.level) {
            this.quotes.level = level;
          } else if (level === this.quotes.level) {
            this.state = "";
          }
        }
      }
    }
  }
}
