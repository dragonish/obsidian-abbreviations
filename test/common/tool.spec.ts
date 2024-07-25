import "mocha";
import { expect } from "chai";
import {
  isSpecialOrWhitespace,
  getWords,
  getAbbreviationInfo,
  queryAbbreviationTitle,
  isAbbreviationsEmpty,
} from "../../common/tool";
import type { AbbreviationInfo } from "../../common/tool";

describe("common/tool", function () {
  it("isSpecialOrWhitespace", function () {
    const list1 =
      " 	\"'`!~@#$%^&*()-_+=,.:;<>/?\\|[]{}，。“”（）《》，。：；？【】「」〔〕〖〗『』℃°\t\n";
    for (const item of list1) {
      expect(isSpecialOrWhitespace(item)).to.be.true;
    }

    expect(isSpecialOrWhitespace("")).to.be.true;

    const list2 = "01a国國ひカ한";
    for (const item of list2) {
      expect(isSpecialOrWhitespace(item)).to.be.false;
    }
  });

  it("getWords", function () {
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
});
