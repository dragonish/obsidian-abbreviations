import "mocha";
import { expect } from "chai";
import { type Parser as ParserType } from "../../common/parser";
import { loadWithMockedObsidian } from "../helpers/obsidianMock";

const parserModule = loadWithMockedObsidian("../../common/parser");
const Parser = parserModule.Parser as typeof ParserType;

describe("common/parser", function () {
  it("Parser.constructor", function () {
    const parser1 = new Parser([], "abbr", {});
    expect(parser1.abbreviations).to.be.empty;

    const parser2 = new Parser(
      [{ key: "TEST", title: "test value" }],
      "abbr",
      {}
    );
    expect(parser2.abbreviations).to.deep.eq([
      {
        key: "TEST",
        title: "test value",
        type: "global",
      },
    ]);

    const parser3 = new Parser([{ key: "", title: "test value" }], "abbr", {});
    expect(parser3.abbreviations).to.be.empty;

    const parser4 = new Parser(
      [
        { key: "", title: "test" },
        { key: "TEST", title: "test value" },
      ],
      "abbr",
      {}
    );
    expect(parser4.abbreviations).to.deep.eq([
      {
        key: "TEST",
        title: "test value",
        type: "global",
      },
    ]);
  });

  it("Parser.readAbbreviationsFromCache", function () {
    const parser = new Parser([], "abbr", {});

    expect(parser.abbreviations).to.be.empty;

    parser.readAbbreviationsFromCache({
      abbr: ["HTML: HyperText Markup Language"],
    });

    expect(parser.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "metadata",
      },
    ]);

    parser.readAbbreviationsFromCache({
      tags: ["CSS: Cascading Style Sheets"],
    });

    expect(parser.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "metadata",
      },
    ]);
  });

  it("Parser.handler", function () {
    const content = [
      "---",
      "abbr:",
      "  - HTML: HyperText Markup Language",
      "---",
      "*[CSS]: Cascading Style Sheets",
    ];

    const parser1 = new Parser([], "abbr", { metadata: true });
    content.forEach((line, index) => {
      parser1.handler(line, index + 1);
    });
    expect(parser1.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "metadata",
      },
    ]);

    const parser2 = new Parser([], "abbr", { metadata: true });
    const content2 = [
      "---",
      "abbr:",
      '  - "HTML: HyperText Markup Language"',
      "---",
      "*[CSS]: Cascading Style Sheets",
    ];
    content2.forEach((line, index) => {
      parser2.handler(line, index + 1);
    });
    expect(parser2.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "metadata",
      },
    ]);

    const parser3 = new Parser([], "abbrs", { metadata: true });
    content.forEach((line, index) => {
      parser3.handler(line, index + 1);
    });
    expect(parser3.abbreviations).to.be.empty;

    const parser4 = new Parser([], "abbr", {});
    content.forEach((line, index) => {
      parser4.handler(line, index + 1);
    });
    expect(parser4.abbreviations).to.be.empty;

    const parser5 = new Parser([], "abbr", { extra: true });
    content.forEach((line, index) => {
      parser5.handler(line, index + 1);
    });
    expect(parser5.abbreviations).to.deep.eq([
      {
        key: "CSS",
        title: "Cascading Style Sheets",
        type: "extra",
        position: 5,
      },
    ]);

    const parser6 = new Parser([], "abbr", { metadata: true, extra: true });
    content.forEach((line, index) => {
      parser6.handler(line, index + 1);
    });
    expect(parser6.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "metadata",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
        type: "extra",
        position: 5,
      },
    ]);

    const parser7 = new Parser([], "abbr", { extra: true });
    parser7.handler("*[CSS]: Cascading\tStyle Sheets", 1);
    expect(parser7.abbreviations).to.deep.eq([
      {
        key: "CSS",
        title: "Cascading\tStyle Sheets",
        type: "extra",
        position: 1,
      },
    ]);

    const parser8 = new Parser([], "abbr", { extra: true });
    const content8 = [
      "````",
      "```",
      "*[CSS]: Cascading Style Sheets",
      "````",
      "",
      "*[HTML]: HyperText Markup Language",
    ];
    content8.forEach((line, index) => {
      parser8.handler(line, index + 1);
    });
    expect(parser8.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "extra",
        position: 6,
      },
    ]);
  });
});
