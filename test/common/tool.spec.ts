import "mocha";
import { expect } from "chai";
import {
  isWhitespace,
  isSpecialOrWhitespace,
  isWord,
  findCharCount,
  getWords,
  parseExtraAbbreviation,
  isExtraDefinitions,
  getAffixList,
  getAbbreviationInstance,
  findAllIndexes,
  queryOverlap,
  selectNonOverlappingItems,
  queryAbbreviationTitle,
  isAbbreviationsEmpty,
  calcAbbrListFromFrontmatter,
  findAbbrIndexFromFrontmatter,
  findAbbrIndexFromGlobal,
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

  it("isWord", function () {
    const list1 = ["0", "test", "a&b", "a-b", "国國ひカ한"];
    for (const item of list1) {
      expect(isWord(item)).to.be.true;
    }

    const list2 = ["", " ", " test", "test ", "a b", "a+b"];
    for (const item of list2) {
      expect(isWord(item)).to.be.false;
    }
  });

  it("findCharCount", function () {
    expect(findCharCount("test", "t")).to.eq(2);
    expect(findCharCount("test", "a")).to.eq(0);
    expect(findCharCount("", "t")).to.eq(0);
    expect(findCharCount("test", "")).to.eq(0);
    expect(findCharCount("", "")).to.eq(0);
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

  it("findAllIndexes", function () {
    expect(findAllIndexes("This is a test string.", "")).to.be.empty;
    expect(findAllIndexes("This is a test string.", "test")).to.deep.eq([10]);
    expect(
      findAllIndexes("This is a test string for testing.", "test")
    ).to.deep.eq([10, 26]);
  });

  it("queryOverlap", function () {
    expect(
      queryOverlap(
        {
          index: 0,
          text: "test",
        },
        {
          index: 0,
          text: "test",
        }
      )
    ).to.eq("same");

    expect(
      queryOverlap(
        {
          index: 0,
          text: "test",
        },
        {
          index: 0,
          text: "t",
        }
      )
    ).to.eq("contain");

    expect(
      queryOverlap(
        {
          index: 0,
          text: "t",
        },
        {
          index: 0,
          text: "test",
        }
      )
    ).to.eq("included");

    expect(
      queryOverlap(
        {
          index: 4,
          text: "test",
        },
        {
          index: 3,
          text: "ate",
        }
      )
    ).to.eq("intersection");

    expect(
      queryOverlap(
        {
          index: 4,
          text: "test",
        },
        {
          index: 7,
          text: "test",
        }
      )
    ).to.eq("intersection");

    expect(
      queryOverlap(
        {
          index: 0,
          text: "test",
        },
        {
          index: 4,
          text: "test",
        }
      )
    ).to.eq("unrelated");
  });

  it("selectNonOverlappingItems", function () {
    expect(selectNonOverlappingItems([])).to.be.empty;

    expect(
      selectNonOverlappingItems([
        {
          type: "metadata",
          key: "test",
          title: "test1",
          index: 0,
          text: "test",
          abbrPos: -1,
        },
      ])
    ).to.deep.eq([
      {
        type: "metadata",
        key: "test",
        title: "test1",
        index: 0,
        text: "test",
      },
    ]);

    expect(
      selectNonOverlappingItems([
        {
          type: "metadata",
          key: "test",
          title: "test1",
          index: 1,
          text: "test",
          abbrPos: -1,
        },
        {
          type: "metadata",
          key: "ate",
          title: "test2",
          index: 0,
          text: "ate",
          abbrPos: 9,
        },
      ])
    ).to.deep.eq([
      {
        type: "metadata",
        key: "test",
        title: "test1",
        index: 1,
        text: "test",
      },
    ]);

    expect(
      selectNonOverlappingItems([
        {
          type: "metadata",
          key: "ate",
          title: "test1",
          index: 0,
          text: "ate",
          abbrPos: -1,
        },
        {
          type: "metadata",
          key: "test",
          title: "test2",
          index: 1,
          text: "test",
          abbrPos: -1,
        },
        {
          type: "extra",
          position: 9,
          key: "sta",
          title: "test3",
          index: 3,
          text: "sta",
          abbrPos: 9,
        },
      ])
    ).to.deep.eq([
      {
        type: "metadata",
        key: "test",
        title: "test2",
        index: 1,
        text: "test",
      },
    ]);

    expect(
      selectNonOverlappingItems([
        {
          type: "extra",
          position: 9,
          key: "test",
          title: "test1",
          index: 0,
          text: "test",
          abbrPos: 9,
        },
        {
          type: "extra",
          position: 9,
          key: "test",
          title: "test1",
          index: 4,
          text: "test",
          abbrPos: 9,
        },
      ])
    ).to.deep.eq([
      {
        type: "extra",
        position: 9,
        key: "test",
        title: "test1",
        index: 0,
        text: "test",
      },
      {
        type: "extra",
        position: 9,
        key: "test",
        title: "test1",
        index: 4,
        text: "test",
      },
    ]);
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

    expect(queryAbbreviationTitle("HTML", abbrList1, 1)).to.deep.eq({
      key: "HTML",
      title: "HyperText Markup Language",
      type: "global",
      index: 0,
      text: "HTML",
    });
    expect(queryAbbreviationTitle("CSS", abbrList1, 1)).to.deep.eq({
      key: "CSS",
      title: "Cascading Style Sheets",
      type: "metadata",
      index: 0,
      text: "CSS",
    });
    expect(queryAbbreviationTitle("CSS", abbrList1, 30)).to.deep.eq({
      key: "CSS",
      title: "Cross Site Scripting",
      type: "extra",
      index: 0,
      text: "CSS",
      position: 25,
    });
    expect(queryAbbreviationTitle("CSS", abbrList1, 60)).to.be.null;

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
    expect(queryAbbreviationTitle("HTM", abbrList2, 32)).to.deep.eq({
      key: "HTM",
      title: "Test",
      type: "extra",
      index: 0,
      text: "HTM",
      position: 34,
    });
    expect(queryAbbreviationTitle("HTM", abbrList2, 36)).to.deep.eq({
      key: "HTM",
      title: "Test",
      type: "extra",
      index: 0,
      text: "HTM",
      position: 34,
    });
    expect(queryAbbreviationTitle("HTM", abbrList2, 40)).to.be.null;
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

    expect(queryAbbreviationTitle("HTMLs", abbrList1, 1, affixList)).to.deep.eq(
      {
        key: "HTML",
        title: "HyperText Markup Language",
        type: "global",
        index: 0,
        text: "HTMLs",
      }
    );
    expect(queryAbbreviationTitle("CSSes", abbrList1, 1, affixList)).to.deep.eq(
      {
        key: "CSS",
        title: "Cascading Style Sheets",
        type: "metadata",
        index: 0,
        text: "CSSes",
      }
    );
    expect(
      queryAbbreviationTitle("CSSes", abbrList1, 30, affixList)
    ).to.deep.eq({
      key: "CSS",
      title: "Cross Site Scripting",
      type: "extra",
      index: 0,
      text: "CSSes",
      position: 25,
    });
    expect(queryAbbreviationTitle("CSSes", abbrList1, 60, affixList)).to.be
      .null;

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
    expect(queryAbbreviationTitle("HTMs", abbrList2, 32, affixList)).to.deep.eq(
      {
        key: "HTM",
        type: "extra",
        title: "Test",
        index: 0,
        text: "HTMs",
        position: 34,
      }
    );
    expect(
      queryAbbreviationTitle("HTMes", abbrList2, 36, affixList)
    ).to.deep.eq({
      key: "HTM",
      type: "extra",
      title: "Test",
      index: 0,
      text: "HTMes",
      position: 34,
    });
    expect(queryAbbreviationTitle("HTMless", abbrList2, 40, affixList)).to.be
      .null;

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
    expect(queryAbbreviationTitle("HTMs", abbrList3, 1, affixList)).to.deep.eq({
      key: "HTMs",
      title: "Test1",
      type: "metadata",
      index: 0,
      text: "HTMs",
    });
    expect(queryAbbreviationTitle("HTM", abbrList3, 1, affixList)).to.deep.eq({
      key: "HTM",
      title: "Test2",
      type: "metadata",
      index: 0,
      text: "HTM",
    });

    const abbrList4: AbbreviationInstance[] = [
      {
        key: "",
        title: "Test",
        type: "metadata",
      },
    ];
    expect(queryAbbreviationTitle("es", abbrList4, 1, affixList)).to.be.null;
  });

  it("queryAbbreviationTitle with detectCJK", function () {
    const abbrList1: AbbreviationInstance[] = [
      {
        key: "北大",
        title: "北京大学",
        type: "metadata",
      },
    ];

    expect(queryAbbreviationTitle("我是一名北大学子", abbrList1, 1, [], false))
      .to.be.null;
    expect(
      queryAbbreviationTitle("我是一名北大学子", abbrList1, 1, [], true)
    ).to.deep.eq([
      {
        key: "北大",
        type: "metadata",
        index: 4,
        text: "北大",
        title: "北京大学",
      },
    ]);

    const abbrList2: AbbreviationInstance[] = [
      {
        key: "北大学",
        title: "测试",
        type: "metadata",
      },
      {
        key: "北大",
        title: "北京大学",
        type: "metadata",
      },
    ];
    expect(
      queryAbbreviationTitle("我是一名北大学子", abbrList2, 1, [], true)
    ).to.deep.eq([
      {
        key: "北大学",
        type: "metadata",
        index: 4,
        text: "北大学",
        title: "测试",
      },
    ]);

    const abbrList3: AbbreviationInstance[] = [
      {
        key: "北大",
        title: "北京大学",
        type: "metadata",
      },
      {
        key: "北大学",
        title: "测试",
        type: "extra",
        position: 99,
      },
    ];
    expect(
      queryAbbreviationTitle("我是一名北大学子", abbrList3, 1, [], true)
    ).to.deep.eq([
      {
        key: "北大学",
        type: "extra",
        position: 99,
        index: 4,
        text: "北大学",
        title: "测试",
      },
    ]);
    expect(
      queryAbbreviationTitle(
        "我是一名北大学子并向北大概测量了一下",
        abbrList3,
        1,
        [],
        true
      )
    ).to.deep.eq([
      {
        key: "北大学",
        type: "extra",
        position: 99,
        index: 4,
        text: "北大学",
        title: "测试",
      },
      {
        key: "北大",
        type: "metadata",
        index: 10,
        text: "北大",
        title: "北京大学",
      },
    ]);
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

    const abbrList4: AbbreviationInstance[] = [
      {
        key: "",
        title: "HyperText Markup Language",
        type: "global",
      },
      {
        key: "",
        title: "HyperText Markup Language",
        type: "extra",
        position: 1,
      },
    ];
    expect(isAbbreviationsEmpty(abbrList4)).to.be.true;
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

  it("findAbbrIndexFromFrontmatter", function () {
    const abbr: AbbreviationInstance = {
      key: "CSS",
      title: "Cascading Style Sheets",
      type: "metadata",
    };

    expect(findAbbrIndexFromFrontmatter(abbr, {}, "abbr")).to.eq(-1);

    const frontmatter1 = {
      tags: ["Tag", "Test"],
      abbr: ["HTML: HyperText Markup Language"],
    };
    expect(findAbbrIndexFromFrontmatter(abbr, frontmatter1, "abbr")).to.eq(-1);

    const frontmatter2 = {
      abbr: [
        "HTML: HyperText Markup Language",
        { CSS: "Cascading Style Sheets" },
        "Tag",
      ],
    };
    expect(findAbbrIndexFromFrontmatter(abbr, frontmatter2, "abbr")).to.eq(1);

    const frontmatter3 = {
      abbr: [
        "HTML: HyperText Markup Language",
        "Tag",
        { CSS: "Cascading Style Sheets" },
      ],
    };
    expect(findAbbrIndexFromFrontmatter(abbr, frontmatter3, "abbr")).to.eq(2);

    const frontmatter4 = {
      abbr: [
        "CSS: ",
        "CSS: Cascading Style Sheets",
        { CSS: "Cascading Style Sheets" },
      ],
    };
    expect(findAbbrIndexFromFrontmatter(abbr, frontmatter4, "abbr")).to.eq(2);

    const frontmatter5 = {
      abbr: [
        "CSS: ",
        { CSS: "Cascading Style Sheets" },
        "CSS: Cascading Style Sheets",
      ],
    };
    expect(findAbbrIndexFromFrontmatter(abbr, frontmatter5, "abbr")).to.eq(2);
  });

  it("findAbbrIndexFromGlobal", function () {
    const abbr: AbbreviationInstance = {
      key: "CSS",
      title: "Cascading Style Sheets",
      type: "global",
    };

    expect(findAbbrIndexFromGlobal(abbr, [])).to.eq(-1);

    const globalAbbreviations1 = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
    ];
    expect(findAbbrIndexFromGlobal(abbr, globalAbbreviations1)).to.eq(-1);

    const globalAbbreviations2 = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
      },
      {
        key: "TAG",
        title: "",
      },
    ];
    expect(findAbbrIndexFromGlobal(abbr, globalAbbreviations2)).to.eq(1);

    const globalAbbreviations3 = [
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
      {
        key: "TAG",
        title: "",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
      },
    ];
    expect(findAbbrIndexFromGlobal(abbr, globalAbbreviations3)).to.eq(2);

    const globalAbbreviations4 = [
      {
        key: "CSS",
        title: "",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
      },
      {
        key: "CSS",
        title: "Cascading Style Sheets",
      },
    ];
    expect(findAbbrIndexFromGlobal(abbr, globalAbbreviations4)).to.eq(2);
  });
});
