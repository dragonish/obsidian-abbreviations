import "mocha";
import { expect } from "chai";
import { Parser } from "../../common/parser";

describe("common/parser", function () {
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
  });
});
