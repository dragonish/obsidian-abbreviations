export abstract class Base {
  protected state: SpecialState;

  protected codeBlocks: CodeBlocks;
  protected quotes: Quotes;

  constructor() {
    this.state = "";
    this.codeBlocks = {
      graveCount: 0,
    };
    this.quotes = {
      level: 0,
    };
  }

  isMetadataState() {
    return this.state === "metadata";
  }
}
