import "mocha";
import { expect } from "chai";
import { loadWithMockedObsidian } from "../helpers/obsidianMock";

const formatModule = loadWithMockedObsidian("../../common/format");

describe("common/format", function () {
  it("escapeHtml", function () {
    const escapeHtml = formatModule.escapeHtml;
    expect(escapeHtml("")).to.be.empty;
    expect(escapeHtml("<")).to.eq("&lt;");
    expect(escapeHtml(">")).to.eq("&gt;");
    expect(escapeHtml('"')).to.eq("&quot;");
    expect(escapeHtml("'")).to.eq("&#39;");
    expect(escapeHtml("&")).to.eq("&amp;");
    expect(escapeHtml("a")).to.eq("a");
  });

  it("lineMarkupFormatter", function () {
    const lineMarkupFormatter = formatModule.lineMarkupFormatter;

    expect(lineMarkupFormatter("", [])).to.be.empty;
    expect(lineMarkupFormatter("This is a test string.", [])).to.eq(
      "This is a test string.",
    );

    expect(
      lineMarkupFormatter("This is a TEST string.", [
        {
          index: 10,
          text: "TEST",
          title: "A test",
        },
      ]),
    ).to.eq('This is a <abbr title="A test">TEST</abbr> string.');

    expect(
      lineMarkupFormatter("THIS is a TEST string.", [
        {
          index: 0,
          text: "THIS",
          title: "A this",
        },
        {
          index: 10,
          text: "TEST",
          title: "A test",
        },
      ]),
    ).to.eq(
      '<abbr title="A this">THIS</abbr> is a <abbr title="A test">TEST</abbr> string.',
    );

    expect(
      lineMarkupFormatter("You can use CSS to style your HTML.", [
        {
          index: 12,
          text: "CSS",
          title: "Cascading Style Sheets",
        },
        {
          index: 30,
          text: "HTML",
          title: "HyperText Markup Language",
        },
      ]),
    ).to.eq(
      'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
    );
  });

  it("contentFormatter", function () {
    const contentFormatter = formatModule.contentFormatter;

    expect(contentFormatter("", [], "", false)).to.be.empty;

    const abbrs = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
      },
    ];

    const content1 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "You can use CSS to style your HTML.",
    ].join("\n");

    expect(
      contentFormatter(content1, abbrs, "abbr", false).split("\n"),
    ).to.deep.eq([
      "#Test",
      "",
      'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
    ]);

    const content2 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "You can use CSS to style your HTMLs.",
    ].join("\n");

    expect(
      contentFormatter(content2, abbrs, "abbr", false, ["s"]).split("\n"),
    ).to.deep.eq([
      "#Test",
      "",
      'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTMLs</abbr>.',
    ]);

    const content3 = [
      "---",
      "tags:",
      "  - test",
      "abbr:",
      "  - HTML: HyperText Markup Language",
      "  - CSS: Cascading Style Sheets",
      "---",
      "#Test",
      "",
      "You can use CSS to style your HTML.",
    ].join("\n");

    expect(
      contentFormatter(content3, [], "abbr", false).split("\n"),
    ).to.deep.eq([
      "#Test",
      "",
      'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
    ]);

    expect(
      contentFormatter(content3, [], "abbrs", false).split("\n"),
    ).to.deep.eq(["#Test", "", "You can use CSS to style your HTML."]);

    const content4 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "You can use CSS to style your HTML.",
      "",
      "*[HTML]: HyperText Markup Language",
      "*[CSS]: Cascading Style Sheets",
    ].join("\n");

    expect(contentFormatter(content4, [], "abbr", true).split("\n")).to.deep.eq(
      [
        "#Test",
        "",
        'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
        "",
      ],
    );

    const content5 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "You can use CSS to style your HTML.",
      "",
      "*[HTML]: HyperText Markup Language",
      "*[CSS]: Cascading Style Sheets",
      "",
    ].join("\n");

    expect(contentFormatter(content5, [], "abbr", true).split("\n")).to.deep.eq(
      [
        "#Test",
        "",
        'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
        "",
      ],
    );

    const content6 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "You can use CSS to style your HTML.",
      "",
      "*[HTML]: HyperText Markup Language",
      "*[CSS]: Cascading Style Sheets",
      "",
      "",
    ].join("\n");

    expect(contentFormatter(content6, [], "abbr", true).split("\n")).to.deep.eq(
      [
        "#Test",
        "",
        'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
        "",
        "",
      ],
    );

    const content7 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "*[CSS]: Cascading Style Sheets",
      "",
      "You can use CSS to style your HTML.",
      "",
      "*[HTML]: HyperText Markup Language",
      "",
    ].join("\n");

    expect(contentFormatter(content7, [], "abbr", true).split("\n")).to.deep.eq(
      [
        "#Test",
        "",
        'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
        "",
      ],
    );

    const content8 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "  ",
      "*[CSS]: Cascading Style Sheets",
      "  ",
      "You can use CSS to style your HTML.",
      "  ",
      "*[HTML]: HyperText Markup Language",
      "  ",
    ].join("\n");

    expect(contentFormatter(content8, [], "abbr", true).split("\n")).to.deep.eq(
      [
        "#Test",
        "  ",
        "  ",
        'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
        "  ",
        "  ",
      ],
    );

    const content9 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "*[CSS]: Cascading Style Sheets",
      "You can use CSS to style your HTML.",
      "*[HTML]: HyperText Markup Language",
      "",
    ].join("\n");

    expect(contentFormatter(content9, [], "abbr", true).split("\n")).to.deep.eq(
      [
        "#Test",
        "",
        'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
        "",
      ],
    );

    const content10 = [
      "---",
      "tags:",
      "  - test",
      "---",
      "#Test",
      "",
      "*[HTML]: HyperText Markup Language",
      "*[CSS]: Cascading Style Sheets",
      "",
      "You can use CSS to style your HTML.",
      "",
      "```",
      "You can use CSS to style your HTML.",
      "```",
    ].join("\n");

    expect(
      contentFormatter(content10, [], "abbr", true).split("\n"),
    ).to.deep.eq([
      "#Test",
      "",
      'You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.',
      "",
      "```",
      "You can use CSS to style your HTML.",
      "```",
    ]);
  });
});
