import { MarkBuffer } from "./mark";
import type {
  AbbreviationInstance,
  SpecialState,
  CodeBlocks,
  Quotes,
} from "./data";
import { METADATA_BORDER } from "./data";
import {
  queryAbbreviationTitle,
  findCharCount,
  parseExtraAbbreviation,
} from "./tool";

interface MarkItem {
  index: number;
  text: string;
  title: string;
}

export class Conversion {
  private readonly mark: MarkBuffer;

  private abbreviations: AbbreviationInstance[];
  private affixList: string[];

  private skipExtraDefinition: boolean;

  private state: SpecialState;

  private codeBlocks: CodeBlocks;
  private quotes: Quotes;
  private lastEmptyLine: boolean;

  constructor(
    abbreviations: AbbreviationInstance[],
    skipExtraDefinition: boolean,
    affixList: string[] = []
  ) {
    this.abbreviations = abbreviations;
    this.skipExtraDefinition = skipExtraDefinition;
    this.affixList = affixList;
    this.state = "";
    this.codeBlocks = {
      graveCount: 0,
    };
    this.quotes = {
      level: 0,
    };
    this.lastEmptyLine = true;
    this.mark = new MarkBuffer();
  }

  /**
   * Line content handler.
   * - Do not process Properties(Metadata), Code blocks, Math
   * - Process Comments
   * @param text
   * @param lineStart
   * @param callback
   */
  handler(
    text: string,
    lineStart: number,
    callback: (marks: MarkItem[], isDefinition: boolean) => void
  ): void {
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

      if (this.skipExtraDefinition) {
        const parseRes = parseExtraAbbreviation(text);
        if (parseRes) {
          callback([], true);
          return;
        }
      }

      const words = this.mark.handler(text);
      callback(
        words
          .map((word) => {
            const abbrTitle = queryAbbreviationTitle(
              word.text,
              this.abbreviations,
              lineStart,
              this.affixList
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
          .filter((v) => v !== null),
        false
      );
      return;
    } else {
      if (this.state === "metadata") {
        if (text === METADATA_BORDER) {
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
  }
}
