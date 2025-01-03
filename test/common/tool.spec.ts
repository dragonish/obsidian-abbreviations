import "mocha";
import { expect } from "chai";
import {
  isWhitespace,
  isSpecialOrWhitespace,
  findCharCount,
  getWords,
  getAbbreviationInfo,
  queryAbbreviationTitle,
  isAbbreviationsEmpty,
  calcAbbrList,
} from "../../common/tool";
import type { AbbreviationInfo } from "../../common/tool";

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

  it("getAbbreviationInfo", function () {
    expect(getAbbreviationInfo("HTML: HyperText Markup Language")).to.deep.eq({
      key: "HTML",
      title: "HyperText Markup Language",
    });

    expect(getAbbreviationInfo("HTML : ")).to.deep.eq({
      key: "HTML",
      title: "",
    });

    expect(
      getAbbreviationInfo({ HTML: "HyperText Markup Language" })
    ).to.deep.eq({
      key: "HTML",
      title: "HyperText Markup Language",
    });

    expect(getAbbreviationInfo({ HTML: "" })).to.deep.eq({
      key: "HTML",
      title: "",
    });

    expect(getAbbreviationInfo("HTML")).to.be.null;
    expect(getAbbreviationInfo({})).to.be.null;
    expect(getAbbreviationInfo({ HTML: 1 })).to.be.null;
  });

  it("queryAbbreviationTitle", function () {
    const abbrList: AbbreviationInfo[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
      },
      {
        key: "CSS",
        title: "",
      },
    ];

    expect(queryAbbreviationTitle("HTML", abbrList)).to.eq(
      "HyperText Markup Language"
    );
    expect(queryAbbreviationTitle("CSS", abbrList)).to.be.empty;

    expect(queryAbbreviationTitle("", abbrList)).to.be.null;
    expect(queryAbbreviationTitle("html", abbrList)).to.be.null;
  });

  it("isAbbreviationsEmpty", function () {
    expect(isAbbreviationsEmpty([])).to.be.true;

    const abbrList1: AbbreviationInfo[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
    ];
    expect(isAbbreviationsEmpty(abbrList1)).to.be.false;

    const abbrList2: AbbreviationInfo[] = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
      {
        key: "HTML",
        title: "",
      },
    ];
    expect(isAbbreviationsEmpty(abbrList2)).to.be.true;
  });

  it("calcAbbrList", function () {
    expect(calcAbbrList(undefined, undefined)).to.be.empty;
    expect(calcAbbrList({}, "abbr")).to.be.empty;

    const frontmatter1 = {
      tags: ["Tag", "Test"],
      abbr: ["HTML: HyperText Markup Language"],
    };

    expect(calcAbbrList(frontmatter1, "abbr")).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
    ]);
    expect(calcAbbrList(frontmatter1, "tags")).to.be.empty;
    expect(calcAbbrList(frontmatter1, "other")).to.be.empty;
    expect(calcAbbrList(frontmatter1, "")).to.be.empty;

    const frontmatter2 = {
      abbr: [
        "HTML: HyperText Markup Language",
        { CSS: "Cascading Style Sheets" },
        "Tag",
      ],
    };
    expect(calcAbbrList(frontmatter2, "abbr")).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
      },
    ]);

    const frontmatter3 = {
      abbr: ["R&D: Research and Development", { "C-suite": "Corporate suite" }],
    };
    expect(calcAbbrList(frontmatter3, "abbr")).to.deep.eq([
      {
        key: "R&D",
        title: "Research and Development",
      },
      {
        key: "C-suite",
        title: "Corporate suite",
      },
    ]);
  });
});
