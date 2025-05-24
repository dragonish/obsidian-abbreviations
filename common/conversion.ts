import { METADATA_BORDER } from "./data";
import { Base } from "./base";
import { MarkBuffer } from "./mark";
import {
  queryAbbreviationTitle,
  findCharCount,
  parseExtraAbbreviation,
} from "./tool";

export class Conversion extends Base {
  private readonly mark: MarkBuffer;

  private abbreviations: AbbreviationInstance[];
  private affixList: string[];
  private detectCJK: boolean;

  private skipExtraDefinition: boolean;

  private listState: boolean;

  constructor(
    abbreviations: AbbreviationInstance[],
    skipExtraDefinition: boolean,
    affixList: string[] = [],
    detectCJK = false
  ) {
    super();

    this.abbreviations = abbreviations;
    this.skipExtraDefinition = skipExtraDefinition;
    this.affixList = affixList;
    this.detectCJK = detectCJK;
    this.listState = false;

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
    callback: (
      marks: MarkInstance[],
      definition: AbbreviationInfo | null
    ) => void
  ): void {
    if (lineStart === 1 && text === METADATA_BORDER) {
      this.state = "metadata";
      callback([], null);
      return;
    }

    if (this.quotes.level > 0) {
      if (this.state !== "math" && text.trim().length === 0) {
        //! empty line
        this.state = "";
        this.codeBlocks.graveCount = 0;
        this.quotes.level = 0;
        this.listState = false;
        callback([], null);
        return;
      }
    }

    if (this.state === "") {
      if (/^(?:[ ]{4,}|\t|[> ]+(?:[ ]{5,}|\t))/.test(text)) {
        if (!this.listState) {
          // pure code blocks
          callback([], null);
          return;
        }
      }

      if (text.match(/^(?:[> \t]*[-*+][ ]{1,4}|[> \t]*\d+\.[ ]{1,4})/)) {
        this.listState = true;
      } else {
        this.listState = false;
      }

      const codeBlocks = text.match(/^([> ]*`{3,})[^`]*$/);
      if (codeBlocks) {
        this.state = "codeBlocks";
        this.codeBlocks.graveCount = findCharCount(codeBlocks[1], "`");
        this.quotes.level = findCharCount(codeBlocks[1], ">");
        callback([], null);
        return;
      }

      const math = text.match(/^([> ]*)\$\$(.*)/);
      if (math && !math[2].trim().endsWith("$$")) {
        this.state = "math";
        this.quotes.level = findCharCount(math[1], ">");
        callback([], null);
        return;
      }

      if (this.skipExtraDefinition) {
        const parseRes = parseExtraAbbreviation(text);
        if (parseRes) {
          callback([], parseRes);
          return;
        }
      }

      const results: MarkInstance[] = [];
      const words = this.mark.handler(text);
      words.forEach((word) => {
        const abbrTitle = queryAbbreviationTitle(
          word.text,
          this.abbreviations,
          lineStart,
          this.affixList,
          this.detectCJK
        );

        if (Array.isArray(abbrTitle)) {
          for (const item of abbrTitle) {
            const { index, ...other } = item;
            results.push({
              index: word.position + index,
              ...other,
            });
          }
        } else if (abbrTitle) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { index: _index, text: _text, ...other } = abbrTitle;
          results.push({
            index: word.position,
            text: word.text,
            ...other,
          });
        }
      });
      callback(results, null);
      return;
    } else {
      if (this.state === "metadata") {
        if (text === METADATA_BORDER) {
          //? Early callback, can read the row's metadata state in the callback
          callback([], null);
          this.state = "";
          return;
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
    callback([], null);
    return;
  }
}
