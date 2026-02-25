import { isWhitespace, isSpecialOrWhitespace } from "./tool";

interface MarkWord {
  text: string;
  /** Position index */
  position: number;
}

type MarkType =
  | "word"
  | "inlineCode"
  | "inlineMath"
  | "tag"
  | "link"
  | "separator";

interface GraveItem {
  isStart: boolean;
  startLen: number;
  count: number;
}

interface LinkItem {
  mode: "text" | "end";
  wait: "" | "textClose" | "URLOpen" | "URLClose";
  openLen: number;
  closeCount: number;
  isInlineFootnote: boolean;
}

export class MarkBuffer {
  private marks: MarkWord[];

  private buffer: string;
  private position: number;
  private mode: MarkType;

  private grave: GraveItem = {
    isStart: false,
    startLen: 0,
    count: 0,
  };
  private link: LinkItem = {
    mode: "end",
    wait: "",
    openLen: 0,
    closeCount: 0,
    isInlineFootnote: false,
  };

  constructor() {
    this.init();
  }

  private init() {
    //? the `buffer` is empty and the `mode` is "separator",
    //? indicating at the beginning of the line.

    this.marks = [];
    this.buffer = "";
    this.position = 0;
    this.mode = "separator";
    this.grave.isStart = false;
    this.grave.startLen = 0;
    this.grave.count = 0;
    this.link.mode = "end";
    this.link.wait = "";
    this.link.openLen = 0;
    this.link.closeCount = 0;
    this.link.isInlineFootnote = false;
  }

  private charHandler(index: number, char: string) {
    const codePoint = char.codePointAt(0);
    if (!codePoint) {
      return;
    }
    char = String.fromCodePoint(codePoint);

    if (this.mode === "inlineCode") {
      //? No need to worry about whether the prefix characters are escaped
      if (char === "`") {
        if (this.grave.isStart) {
          this.grave.startLen++;
        } else {
          this.grave.count++;
        }
        this.buffer += char;
      } else {
        this.grave.isStart = false;
        if (this.grave.startLen === this.grave.count) {
          //* Discard inline code fragments
          this.mode = isSpecialOrWhitespace(char) ? "separator" : "word";
          this.grave.startLen = 0;
          this.grave.count = 0;
          this.buffer = char;
          this.position = index;
        } else {
          this.grave.count = 0;
          this.buffer += char;
        }
      }
    } else if (this.mode === "inlineMath") {
      if (char === "$" && !this.isPrefixEscape(-1, true)) {
        //* Discard inline math fragments
        this.mode = "word"; //? This way the next `#` does not trigger "tag" mode
        this.buffer = "";
        this.position = index + 1;
      } else {
        this.buffer += char;
      }
    } else if (
      this.mode === "link" &&
      this.link.mode === "text" &&
      (this.link.wait !== "URLOpen" ||
        (this.link.wait === "URLOpen" && char === "("))
    ) {
      if (this.link.wait === "URLOpen" && char === "(") {
        this.link.wait = "URLClose";
      } else if (
        this.link.wait === "textClose" &&
        char === "]" &&
        !this.isPrefixEscape()
      ) {
        this.link.wait = "";
        this.link.mode = "end";
      } else if (
        this.link.wait === "URLClose" &&
        char === ")" &&
        !this.isPrefixEscape()
      ) {
        this.link.wait = "";
        this.link.mode = "end";
      } else if (
        char === "[" &&
        !this.isPrefixEscape() &&
        this.link.openLen === 1
      ) {
        this.link.openLen = 2;
      } else if (char === "]" && !this.isPrefixEscape()) {
        this.link.closeCount++;
        if (this.link.openLen === 1 && this.link.closeCount === 1) {
          if (this.link.isInlineFootnote) {
            this.link.wait = "";
            this.link.mode = "end";
          } else {
            this.link.wait = "URLOpen";
          }
        } else if (this.link.openLen === 2 && this.link.closeCount === 1) {
          this.link.wait = "textClose";
        } else {
          this.link.mode = "end";
        }
      }

      this.buffer += char;
    } else {
      if (char === "`" && !this.isPrefixEscape()) {
        this.pushMark();
        this.mode = "inlineCode";
        this.grave.isStart = true;
        this.grave.startLen = 1;
        this.grave.count = 0;
        this.buffer = char;
        this.position = index;
      } else if (char === "$" && !this.isPrefixEscape()) {
        this.pushMark();
        this.mode = "inlineMath";
        this.buffer = char;
        this.position = index;
      } else if (char === "[" && !this.isPrefixEscape()) {
        this.pushMark();
        this.mode = "link";
        this.link.isInlineFootnote =
          this.buffer.at(-1) === "^" && !this.isPrefixEscape(-2);
        this.link.mode = "text";
        this.link.wait = "";
        this.link.openLen = 1;
        this.link.closeCount = 0;
        this.buffer = char;
        this.position = index;
      } else if (this.mode === "tag") {
        if ("-_/".indexOf(char) > -1) {
          //? These are the special characters allowed in the tag
          this.buffer += char;
          return;
        }

        const state = isSpecialOrWhitespace(char);
        if (state) {
          //* Discard tag fragments
          this.mode = "separator";
          this.buffer = char;
          this.position = index;
        } else {
          this.buffer += char;
        }
      } else if (char === "#" && !this.isPrefixEscape()) {
        if (this.mode === "separator") {
          if (
            this.buffer.length === 0 ||
            isWhitespace(this.buffer.at(-1) || "")
          ) {
            //? "tag" mode be triggered if it is preceded
            //? by a blank or at the beginning of a line.
            this.mode = "tag";
            this.buffer = char;
            this.position = index;
          } else {
            this.buffer += char;
          }
        } else {
          this.pushMark();
          this.mode = "separator";
          this.buffer = char;
          this.position = index;
        }
      } else {
        const mode: MarkType = isSpecialOrWhitespace(char)
          ? "separator"
          : "word";
        if (mode === this.mode) {
          this.buffer += char;
        } else {
          this.pushMark();
          this.mode = mode;
          this.buffer = char;
          this.position = index;
        }
      }
    }
  }

  private pushMark() {
    if (this.mode === "word" && this.buffer.length > 0) {
      this.marks.push({
        text: this.buffer,
        position: this.position,
      });
    }
  }

  /**
   * Whether the prefix is an escape character.
   * @param start start boundary. default: `-1`
   * @param onlyBit Check only one character. default: `false`
   * @returns `true` if the prefix is an escape character
   */
  private isPrefixEscape(start = -1, onlyBit = false) {
    if (onlyBit) {
      return this.buffer.at(start) === "\\";
    }
    return this.buffer.at(start) === "\\" && this.buffer.at(start - 1) !== "\\";
  }

  handler(text: string): MarkWord[] {
    this.init();

    let i = 0;
    for (const ch of [...text]) {
      this.charHandler(i, ch);
      i += ch.length;
    }

    this.pushMark();

    return this.marks;
  }
}
