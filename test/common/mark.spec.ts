import "mocha";
import { expect } from "chai";
import { MarkBuffer } from "../../common/mark";

describe("common/mark", function () {
  it("MarkBuffer", function () {
    const mark = new MarkBuffer();

    expect(mark.handler("")).to.be.empty;

    expect(mark.handler("This is a test string.")).to.deep.eq([
      {
        text: "This",
        position: 0,
      },
      {
        text: "is",
        position: 5,
      },
      {
        text: "a",
        position: 8,
      },
      {
        text: "test",
        position: 10,
      },
      {
        text: "string",
        position: 15,
      },
    ]);

    expect(mark.handler('{ "version": 1.0.0 }')).to.deep.eq([
      {
        text: "version",
        position: 3,
      },
      {
        text: "1",
        position: 13,
      },
      {
        text: "0",
        position: 15,
      },
      {
        text: "0",
        position: 17,
      },
    ]);

    expect(mark.handler(" HTML")).to.deep.eq([
      {
        text: "HTML",
        position: 1,
      },
    ]);

    expect(mark.handler("`This is a test string.`")).to.be.empty;

    expect(mark.handler("This is a `test` string.")).to.deep.eq([
      {
        text: "This",
        position: 0,
      },
      {
        text: "is",
        position: 5,
      },
      {
        text: "a",
        position: 8,
      },
      {
        text: "string",
        position: 17,
      },
    ]);

    expect(mark.handler("This is a ``test`` string.")).to.deep.eq([
      {
        text: "This",
        position: 0,
      },
      {
        text: "is",
        position: 5,
      },
      {
        text: "a",
        position: 8,
      },
      {
        text: "string",
        position: 19,
      },
    ]);

    expect(mark.handler("This `is` a `test` string.")).to.deep.eq([
      {
        text: "This",
        position: 0,
      },
      {
        text: "a",
        position: 10,
      },
      {
        text: "string",
        position: 19,
      },
    ]);

    expect(mark.handler("Test `` ` `` string")).to.deep.eq([
      {
        text: "Test",
        position: 0,
      },
      {
        text: "string",
        position: 13,
      },
    ]);

    expect(mark.handler("Test `string")).to.deep.eq([
      {
        text: "Test",
        position: 0,
      },
    ]);

    expect(mark.handler("\\`Test` string")).to.deep.eq([
      {
        text: "Test",
        position: 2,
      },
    ]);
    expect(mark.handler("\\\\`Test` string")).to.deep.eq([
      {
        text: "string",
        position: 9,
      },
    ]);
    expect(mark.handler("`Test\\`")).to.be.empty;

    expect(mark.handler("$math$")).to.be.empty;
    expect(mark.handler("$math string")).to.be.empty;
    expect(mark.handler("$math$ string")).to.deep.eq([
      {
        text: "string",
        position: 7,
      },
    ]);
    expect(mark.handler("\\$math$ string")).to.deep.eq([
      {
        text: "math",
        position: 2,
      },
    ]);
    expect(mark.handler("$ma$th$ string")).to.deep.eq([
      {
        text: "th",
        position: 4,
      },
    ]);
    expect(mark.handler("$ma\\$th$ string")).to.deep.eq([
      {
        text: "string",
        position: 9,
      },
    ]);
    expect(mark.handler("$ma\\\\$th$ string")).to.deep.eq([
      {
        text: "string",
        position: 10,
      },
    ]);

    expect(mark.handler("#Tag")).to.be.empty;
    expect(mark.handler("#Tag-U_H/Nested")).to.be.empty;
    expect(mark.handler("#Tag test")).to.deep.eq([
      {
        text: "test",
        position: 5,
      },
    ]);

    expect(mark.handler("# Headings test")).to.deep.eq([
      {
        text: "Headings",
        position: 2,
      },
      {
        text: "test",
        position: 11,
      },
    ]);

    expect(mark.handler("##BadTag test")).to.deep.eq([
      {
        text: "BadTag",
        position: 2,
      },
      {
        text: "test",
        position: 9,
      },
    ]);

    expect(mark.handler("#Tag#Text test")).to.deep.eq([
      {
        text: "Text",
        position: 5,
      },
      {
        text: "test",
        position: 10,
      },
    ]);

    expect(mark.handler("\\#Tag")).to.deep.eq([
      {
        text: "Tag",
        position: 2,
      },
    ]);

    expect(mark.handler("?#Tag")).to.deep.eq([
      {
        text: "Tag",
        position: 2,
      },
    ]);

    expect(mark.handler("https://example.com/")).to.deep.eq([
      {
        text: "https",
        position: 0,
      },
      {
        text: "example",
        position: 8,
      },
      {
        text: "com",
        position: 16,
      },
    ]);

    expect(mark.handler("[Link](#Anchor)")).to.be.empty;
    expect(mark.handler("[Link](https://example.com/)")).to.be.empty;
    expect(mark.handler("[Link string")).to.be.empty;
    expect(mark.handler("[Link](https://example.com/) string")).to.deep.eq([
      {
        text: "string",
        position: 29,
      },
    ]);
    expect(mark.handler("[Link]( https://example.com/ string")).to.be.empty;
    expect(mark.handler("\\[Link](#Anchor)")).to.deep.eq([
      {
        text: "Link",
        position: 2,
      },
      {
        text: "Anchor",
        position: 9,
      },
    ]);
    expect(mark.handler("[Link\\](#Anchor) string")).to.be.empty;
    expect(mark.handler("[Link\\\\](#Anchor) string")).to.deep.eq([
      {
        text: "string",
        position: 18,
      },
    ]);
    expect(mark.handler("[Li\\]nk](#Anchor)")).to.be.empty;
    expect(mark.handler("[Li]nk](#Anchor)")).to.deep.eq([
      {
        text: "nk",
        position: 4,
      },
      {
        text: "Anchor",
        position: 9,
      },
    ]);
    expect(mark.handler("[[Link]]")).to.be.empty;
    expect(mark.handler("[string[Link]string]")).to.be.empty;
    expect(mark.handler("[[[Link]]string]")).to.deep.eq([
      {
        text: "string",
        position: 9,
      },
    ]);
    expect(mark.handler("[border[string[Link]string]border]")).to.deep.eq([
      {
        text: "border",
        position: 27,
      },
    ]);
    expect(mark.handler("[[Link]](Anchor)")).to.deep.eq([
      {
        text: "Anchor",
        position: 9,
      },
    ]);
    expect(mark.handler("#Tag[Link](#Anchor)")).to.be.empty;

    expect(mark.handler("^[InlineFootnote](string)")).to.deep.eq([
      {
        text: "string",
        position: 18,
      },
    ]);
    expect(mark.handler("[^Footnote]: string")).to.deep.eq([
      {
        text: "string",
        position: 13,
      },
    ]);
    expect(mark.handler("[^Footnote](string)")).to.be.empty;
    expect(mark.handler("^[Footnote string")).to.be.empty;
    expect(mark.handler("\\^[InlineFootnote](string)")).to.be.empty;
    expect(mark.handler("\\\\^[InlineFootnote](string)")).to.deep.eq([
      {
        text: "string",
        position: 20,
      },
    ]);

    expect(mark.handler("Well-being matters.")).to.deep.eq([
      {
        text: "Well-being",
        position: 0,
      },
      {
        text: "matters",
        position: 11,
      },
    ]);
    expect(mark.handler("R&D.")).to.deep.eq([
      {
        text: "R&D",
        position: 0,
      },
    ]);

    expect(mark.handler("*[CSS]: Cascading Style Sheets")).to.deep.eq([
      {
        text: "Cascading",
        position: 8,
      },
      {
        text: "Style",
        position: 18,
      },
      {
        text: "Sheets",
        position: 24,
      },
    ]);
  });
});
