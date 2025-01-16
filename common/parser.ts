import * as yaml from "js-yaml";
import type { AbbreviationInfo, AbbreviationInstance } from "./data";
import { METADATA_BORDER } from "./data";
import { Base } from "./base";
import {
  findCharCount,
  calcAbbrListFromFrontmatter,
  parseExtraAbbreviation,
} from "./tool";

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

    this.abbreviations = [
      ...abbreviations.map<AbbreviationInstance>(({ key, title }) => ({
        key,
        title,
        type: "global",
      })),
    ];

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
        this.lastEmptyLine = true;
        return;
      }
    }

    if (this.state === "") {
      if (this.lastEmptyLine) {
        if (/^[ ]{4,}|\t|[> ]+(?:[ ]{5,}|\t)/.test(text)) {
          // pure code blocks
          return;
        }
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
            try {
              const metadata = yaml.load(
                this.metadataBuffer.join("\n")
              ) as Record<string, unknown>;
              if (typeof metadata === "object" && metadata) {
                const list = calcAbbrListFromFrontmatter(
                  metadata,
                  this.abbreviationKeyword
                );
                this.abbreviations.push(...list);
              }
            } catch {
              //* Do nothing
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

          if (level < this.quotes.level) {
            this.quotes.level = level;
            this.codeBlocks.graveCount = findCharCount(endCodeBlocks[1], "`");
          } else if (
            level === this.quotes.level &&
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
