import "mocha";
import { expect } from "chai";
import type { AbbreviationInstance } from "../../common/data";
import {
  isWhitespace,
  isSpecialOrWhitespace,
  findCharCount,
  getWords,
  parseExtraAbbreviation,
  isExtraDefinitions,
  getAffixList,
  getAbbreviationInstance,
  queryAbbreviationTitle,
  isAbbreviationsEmpty,
  calcAbbrListFromFrontmatter,
} from "../../common/tool";

describe("common/tool", function () {
  it("isWhitespace", function () {
    expect(isWhitespace(" ")).to.be.true;
    expect(isWhitespace("	")).to.be.true;
    expect(isWhitespace("\t")).to.be.true;
    expect(isWhitespace("\n")).to.be.true;
    expect(isWhitespace("")).to.be.false;
    expect(isWhitespace("0")).to.be.false;
  });

  it("isSpecialOrWhitespace", function () {
    const list1 =
      " 	\"'`!~@#$%^*()_+=,.:;<>/?\\|[]{}，。“”（）《》，。：；？【】「」〔〕〖〗『』℃°\t\n";
    for (const item of list1) {
      expect(isSpecialOrWhitespace(item)).to.be.true;
    }

    expect(isSpecialOrWhitespace("")).to.be.true;

    const list2 = "01a国國ひカ한-&";
    for (const item of list2) {
      expect(isSpecialOrWhitespace(item)).to.be.false;
    }
  });

  it("findCharCount", function () {
    expect(findCharCount("test", "t")).to.be.eq(2);
    expect(findCharCount("test", "a")).to.be.eq(0);
    expect(findCharCount("", "t")).to.be.eq(0);
    expect(findCharCount("test", "")).to.be.eq(0);
    expect(findCharCount("", "")).to.be.eq(0);
  });

  it("getWords", function () {
    expect(getWords("")).to.be.empty;

    expect(getWords("This is a test string.")).to.deep.eq([
      {
        text: "This",
        isSpecial: false,
      },
      {
        text: " ",
        isSpecial: true,
      },
      {
        text: "is",
        isSpecial: false,
      },
      {
        text: " ",
        isSpecial: true,
      },
      {
        text: "a",
        isSpecial: false,
      },
      {
        text: " ",
        isSpecial: true,
      },
      {
        text: "test",
        isSpecial: false,
      },
      {
        text: " ",
        isSpecial: true,
      },
      {
        text: "string",
        isSpecial: false,
      },
      {
        text: ".",
        isSpecial: true,
      },
    ]);

    expect(getWords('{ "version": 1.0.0 }')).to.deep.eq([
      {
        text: '{ "',
        isSpecial: true,
      },
      {
        text: "version",
        isSpecial: false,
      },
      {
        text: '": ',
        isSpecial: true,
      },
      {
        text: "1",
        isSpecial: false,
      },
      {
        text: ".",
        isSpecial: true,
      },
      {
        text: "0",
        isSpecial: false,
      },
      {
        text: ".",
        isSpecial: true,
      },
      {
        text: "0",
        isSpecial: false,
      },
      {
        text: " }",
        isSpecial: true,
      },
    ]);

    expect(getWords(" HTML")).to.deep.eq([
      {
        text: " ",
        isSpecial: true,
      },
      {
        text: "HTML",
        isSpecial: false,
      },
    ]);

    expect(getWords("Well-being matters.")).to.deep.eq([
      {
        text: "Well-being",
        isSpecial: false,
      },
      {
        text: " ",
        isSpecial: true,
      },
      {
        text: "matters",
        isSpecial: false,
      },
      {
        text: ".",
        isSpecial: true,
      },
    ]);

    expect(getWords("R&D.")).to.deep.eq([
      {
        text: "R&D",
        isSpecial: false,
      },
      {
        text: ".",
        isSpecial: true,
      },
    ]);
  });

  it("parseExtraAbbreviation", function () {
    expect(
      parseExtraAbbreviation("*[HTML]: HyperText Markup Language")
    ).to.deep.eq({
      key: "HTML",
      title: "HyperText Markup Language",
    });

    expect(
      parseExtraAbbreviation("*[HTML]:   HyperText Markup Language  ")
    ).to.deep.eq({
      key: "HTML",
      title: "HyperText Markup Language",
    });

    expect(parseExtraAbbreviation("*[HTML]:")).to.deep.eq({
      key: "HTML",
      title: "",
    });

    expect(parseExtraAbbreviation("*[HTML]:  ")).to.deep.eq({
      key: "HTML",
      title: "",
    });

    expect(parseExtraAbbreviation("*[HTML]:HyperText Markup Language")).to.be
      .null;
    expect(parseExtraAbbreviation(" *[HTML] :HyperText Markup Language")).to.be
      .null;
    expect(parseExtraAbbreviation("`*[HTML] :HyperText Markup Language`")).to.be
      .null;
    expect(parseExtraAbbreviation("")).to.be.null;

    expect(parseExtraAbbreviation("*[URL](https://www.example.com): content*"))
      .to.be.null;
    expect(parseExtraAbbreviation("*[[PATH]]: content*")).to.be.null;
  });

  it("isExtraDefinitions", function () {
    expect(isExtraDefinitions([""].join("\n"))).to.be.false;

    expect(isExtraDefinitions(["*[OS1]: Test1"].join("\n"))).to.be.true;

    expect(isExtraDefinitions(["*[OS1]: Test1", "[OS2]: Test2"].join("\n"))).to
      .be.false;

    expect(isExtraDefinitions(["[OS1]: Test1", "[OS2]: Test2"].join("\n"))).to
      .be.true;

    expect(
      isExtraDefinitions(
        ["[OS1]: Test1", "[OS2]: Test2", "*[OS3]: Test3"].join("\n")
      )
    ).to.be.true;

    expect(isExtraDefinitions(["*[OS1]: Test1", "A line."].join("\n"))).to.be
      .false;

    expect(
      isExtraDefinitions(["[OS1]: Test1", "[OS2]: Test2", "A line."].join("\n"))
    ).to.be.false;

    expect(
      isExtraDefinitions(["[OS1]: Test1", "A line.", "[OS2]: Test2"].join("\n"))
    ).to.be.false;

    expect(
      isExtraDefinitions(
        ["A line.", "[OS1]: Test1", "[OS2]: Test2", "*[OS3]: Test3"].join("\n")
      )
    ).to.be.false;

    expect(
      isExtraDefinitions(
        ["[OS1]: Test1", "[OS2]: Test2", "*[OS3]: Test3", "A line."].join("\n")
      )
    ).to.be.false;
  });

  it("getAffixList", function () {
    expect(getAffixList("s")).to.deep.eq(["s"]);
    expect(getAffixList("s,s,es")).to.deep.eq(["s", "es"]);
    expect(getAffixList("s,es,less")).to.deep.eq(["s", "es", "less"]);
    expect(getAffixList("s, es, less")).to.deep.eq(["s", "es", "less"]);
    expect(getAffixList(" , s, es, less, ")).to.deep.eq(["s", "es", "less"]);
    expect(getAffixList("")).to.be.empty;
    expect(getAffixList("  ")).to.be.empty;
    expect(getAffixList("0")).to.deep.eq(["0"]);
  });

  it("getAbbreviationInstance", function () {
    expect(
      getAbbreviationInstance("HTML: HyperText Markup Language")
    ).to.deep.eq({
      key: "HTML",
      title: "HyperText Markup Language",
      type: "metadata",
    });

    expect(getAbbreviationInstance("HTML : ")).to.deep.eq({
      key: "HTML",
      title: "",
      type: "metadata",
    });

    expect(
      getAbbreviationInstance({ HTML: "HyperText Markup Language" })
    ).to.deep.eq({
      key: "HTML",
      title: "HyperText Markup Language",
      type: "metadata",
    });

    expect(getAbbreviationInstance({ HTML: "" })).to.deep.eq({
      key: "HTML",
      title: "",
      type: "metadata",
    });

    expect(getAbbreviationInstance("HTML")).to.be.null;
    expect(getAbbreviationInstance({})).to.be.null;
    expect(getAbbreviationInstance({ HTML: 1 })).to.be.null;
  });

  it("queryAbbreviationTitle", function () {
    const abbrList1: AbbreviationInstance[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "global",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
        type: "metadata",
      },
      {
        key: "CSS",
        title: "Cross Site Scripting",
        type: "extra",
        position: 25,
      },
      {
        key: "CSS",
        title: "",
        type: "extra",
        position: 50,
      },
    ];

    expect(queryAbbreviationTitle("HTML", abbrList1, 1)).to.eq(
      "HyperText Markup Language"
    );
    expect(queryAbbreviationTitle("CSS", abbrList1, 1)).to.eq(
      "Cascading Style Sheets"
    );
    expect(queryAbbreviationTitle("CSS", abbrList1, 30)).to.eq(
      "Cross Site Scripting"
    );
    expect(queryAbbreviationTitle("CSS", abbrList1, 60)).to.be.empty;

    expect(queryAbbreviationTitle("", abbrList1, 1)).to.be.null;
    expect(queryAbbreviationTitle("html", abbrList1, 1)).to.be.null;

    const abbrList2: AbbreviationInstance[] = [
      {
        key: "HTM",
        title: "Test",
        type: "extra",
        position: 34,
      },
      {
        key: "HTM",
        title: "",
        type: "extra",
        position: 38,
      },
    ];
    expect(queryAbbreviationTitle("HTM", abbrList2, 32)).to.be.eq("Test");
    expect(queryAbbreviationTitle("HTM", abbrList2, 36)).to.be.eq("Test");
    expect(queryAbbreviationTitle("HTM", abbrList2, 40)).to.be.empty;
  });

  it("queryAbbreviationTitle with affixList", function () {
    const abbrList1: AbbreviationInstance[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "global",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
        type: "metadata",
      },
      {
        key: "CSS",
        title: "Cross Site Scripting",
        type: "extra",
        position: 25,
      },
      {
        key: "CSS",
        title: "",
        type: "extra",
        position: 50,
      },
    ];
    const affixList = ["s", "es", "less"];

    expect(queryAbbreviationTitle("HTMLs", abbrList1, 1, affixList)).to.eq(
      "HyperText Markup Language"
    );
    expect(queryAbbreviationTitle("CSSes", abbrList1, 1, affixList)).to.eq(
      "Cascading Style Sheets"
    );
    expect(queryAbbreviationTitle("CSSes", abbrList1, 30, affixList)).to.eq(
      "Cross Site Scripting"
    );
    expect(queryAbbreviationTitle("CSSes", abbrList1, 60, affixList)).to.be
      .empty;

    expect(queryAbbreviationTitle("", abbrList1, 1, affixList)).to.be.null;
    expect(queryAbbreviationTitle("htmls", abbrList1, 1, affixList)).to.be.null;

    const abbrList2: AbbreviationInstance[] = [
      {
        key: "HTM",
        title: "Test",
        type: "extra",
        position: 34,
      },
      {
        key: "HTM",
        title: "",
        type: "extra",
        position: 38,
      },
    ];
    expect(queryAbbreviationTitle("HTMs", abbrList2, 32, affixList)).to.be.eq(
      "Test"
    );
    expect(queryAbbreviationTitle("HTMes", abbrList2, 36, affixList)).to.be.eq(
      "Test"
    );
    expect(queryAbbreviationTitle("HTMless", abbrList2, 40, affixList)).to.be
      .empty;

    const abbrList3: AbbreviationInstance[] = [
      {
        key: "HTMs",
        title: "Test1",
        type: "metadata",
      },
      {
        key: "HTM",
        title: "Test2",
        type: "metadata",
      },
    ];
    expect(queryAbbreviationTitle("HTMs", abbrList3, 1, affixList)).to.be.eq(
      "Test1"
    );
    expect(queryAbbreviationTitle("HTM", abbrList3, 1, affixList)).to.be.eq(
      "Test2"
    );
  });

  it("isAbbreviationsEmpty", function () {
    expect(isAbbreviationsEmpty([])).to.be.true;

    const abbrList1: AbbreviationInstance[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "global",
      },
    ];
    expect(isAbbreviationsEmpty(abbrList1)).to.be.false;

    const abbrList2: AbbreviationInstance[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "global",
      },
      {
        key: "HTML",
        title: "",
        type: "metadata",
      },
    ];
    expect(isAbbreviationsEmpty(abbrList2)).to.be.true;

    const abbrList3: AbbreviationInstance[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "global",
      },
      {
        key: "HTML",
        title: "",
        type: "extra",
        position: 1,
      },
    ];
    expect(isAbbreviationsEmpty(abbrList3)).to.be.false;
  });

  it("calcAbbrListFromFrontmatter", function () {
    expect(calcAbbrListFromFrontmatter(undefined, undefined)).to.be.empty;
    expect(calcAbbrListFromFrontmatter({}, "abbr")).to.be.empty;

    const frontmatter1 = {
      tags: ["Tag", "Test"],
      abbr: ["HTML: HyperText Markup Language"],
    };

    expect(calcAbbrListFromFrontmatter(frontmatter1, "abbr")).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "metadata",
      },
    ]);
    expect(calcAbbrListFromFrontmatter(frontmatter1, "tags")).to.be.empty;
    expect(calcAbbrListFromFrontmatter(frontmatter1, "other")).to.be.empty;
    expect(calcAbbrListFromFrontmatter(frontmatter1, "")).to.be.empty;

    const frontmatter2 = {
      abbr: [
        "HTML: HyperText Markup Language",
        { CSS: "Cascading Style Sheets" },
        "Tag",
      ],
    };
    expect(calcAbbrListFromFrontmatter(frontmatter2, "abbr")).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "metadata",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
        type: "metadata",
      },
    ]);

    const frontmatter3 = {
      abbr: ["R&D: Research and Development", { "C-suite": "Corporate suite" }],
    };
    expect(calcAbbrListFromFrontmatter(frontmatter3, "abbr")).to.deep.eq([
      {
        key: "R&D",
        title: "Research and Development",
        type: "metadata",
      },
      {
        key: "C-suite",
        title: "Corporate suite",
        type: "metadata",
      },
    ]);
  });
});
