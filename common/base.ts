import type { SpecialState, CodeBlocks, Quotes } from "./data";

export abstract class Base {
  protected state: SpecialState;

  protected codeBlocks: CodeBlocks;
  protected quotes: Quotes;
  protected lastEmptyLine: boolean;

  constructor() {
    this.state = "";
    this.codeBlocks = {
      graveCount: 0,
    };
    this.quotes = {
      level: 0,
    };
    this.lastEmptyLine = true;
  }

  isMetadataState() {
    return this.state === "metadata";
  }
}
