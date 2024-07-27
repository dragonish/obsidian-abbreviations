import { MarkBuffer } from "./mark";
import { queryAbbreviationTitle, findCharCount } from "./tool";
import type { AbbreviationInfo } from "./tool";

interface MarkItem {
  index: number;
  text: string;
  title: string;
}

interface CodeBlocks {
  graveCount: number;
}

interface Quotes {
  level: number;
}

type SpecialState = "" | "metadata" | "codeBlocks" | "math";

export class Conversion {
  private readonly abbreviations: AbbreviationInfo[];
  private readonly mark: MarkBuffer;

  private state: SpecialState = "";

  private codeBlocks: CodeBlocks = {
    graveCount: 0,
  };

  private quotes: Quotes = {
    level: 0,
  };

  private lastEmptyLine = true;

  private static readonly METADATA = "---";

  constructor(abbreviations: AbbreviationInfo[]) {
    this.abbreviations = abbreviations;
    this.mark = new MarkBuffer();
  }

  setMetadataState(): void {
    this.state = "metadata";
  }

  /**
   * Line content handler.
   * - Do not process Properties(Metadata), Code blocks, Math
   * - Process Comments
   * @param text
   * @returns
   */
  handler(text: string): MarkItem[] {
    if (this.quotes.level > 0) {
      if (this.state !== "math" && text.trim().length === 0) {
        //! empty line
        this.state = "";
        this.codeBlocks.graveCount = 0;
        this.quotes.level = 0;
        this.lastEmptyLine = true;
        return [];
      }
    }

    if (this.state === "") {
      if (this.lastEmptyLine) {
        if (/^[ ]{4,}|\t|[> ]+(?:[ ]{5,}|\t)/.test(text)) {
          // pure code blocks
          return [];
        }
      }

      const codeBlocks = text.match(/^([> ]*`{3,})[^`]*$/);
      if (codeBlocks) {
        this.state = "codeBlocks";
        this.codeBlocks.graveCount = findCharCount(codeBlocks[1], "`");
        this.quotes.level = findCharCount(codeBlocks[1], ">");
        return [];
      }

      const math = text.match(/^([> ]*)\$\$(.*)/);
      if (math && !math[2].trim().endsWith("$$")) {
        this.state = "math";
        this.quotes.level = findCharCount(math[1], ">");
        return [];
      }

      const words = this.mark.handler(text);
      return words
        .map((word) => {
          const abbrTitle = queryAbbreviationTitle(
            word.text,
            this.abbreviations
          );
          if (abbrTitle) {
            return {
              index: word.position,
              text: word.text,
              title: abbrTitle,
            };
          }
          return null;
        })
        .filter((v) => v !== null);
    } else {
      if (this.state === "metadata") {
        if (text === Conversion.METADATA) {
          this.state = "";
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

    return [];
  }
}
