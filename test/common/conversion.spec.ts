import "mocha";
import { expect } from "chai";
import type { AbbreviationInstance } from "../../common/data";
import { Conversion } from "../../common/conversion";

describe("common/conversion", function () {
  it("Conversion.handler", function () {
    const abbrList: AbbreviationInstance[] = [
      {
        key: "CSS",
        title: "Cascading Style Sheets",
        type: "global",
      },
    ];

    const content = [
      "---",
      "note:",
      "  - CSS: Test",
      "---",
      "CSS",
      "*[TEST]: CSS",
      "CSS",
      "*[CSS]: Cross Site Scripting",
    ];

    const conversion1 = new Conversion(abbrList, true);
    const res1: unknown[] = [];
    content.forEach((line, index) => {
      conversion1.handler(line, index + 1, (marks, isDefinition) =>
        res1.push({
          marks,
          isDefinition,
        })
      );
    });
    expect(res1).to.deep.eq([
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
          },
        ],
        isDefinition: false,
      },
      { marks: [], isDefinition: true },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
          },
        ],
        isDefinition: false,
      },
      { marks: [], isDefinition: true },
    ]);

    const conversion2 = new Conversion(abbrList, false);
    const res2: unknown[] = [];
    content.forEach((line, index) => {
      conversion2.handler(line, index + 1, (marks, isDefinition) =>
        res2.push({
          marks,
          isDefinition,
        })
      );
      res2.push();
    });
    expect(res2).to.deep.eq([
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
          },
        ],
        isDefinition: false,
      },
      {
        marks: [
          {
            index: 9,
            text: "CSS",
            title: "Cascading Style Sheets",
          },
        ],
        isDefinition: false,
      },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
          },
        ],
        isDefinition: false,
      },
      { marks: [], isDefinition: false },
    ]);

    const conversion3 = new Conversion(abbrList, true, ["es"]);
    const res3: unknown[] = [];
    const content3 = ["---", "note:", "  - CSS: Test", "---", "CSS", "CSSes"];
    content3.forEach((line, index) => {
      conversion3.handler(line, index + 1, (marks, isDefinition) =>
        res3.push({
          marks,
          isDefinition,
        })
      );
    });
    expect(res3).to.deep.eq([
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
          },
        ],
        isDefinition: false,
      },
      {
        marks: [
          {
            index: 0,
            text: "CSSes",
            title: "Cascading Style Sheets",
          },
        ],
        isDefinition: false,
      },
    ]);

    const conversion4 = new Conversion(abbrList, true);
    conversion4.handler("test\tCSS", 1, (marks) => {
      expect(marks).to.deep.eq([
        {
          index: 5,
          text: "CSS",
          title: "Cascading Style Sheets",
        },
      ]);
    });

    const res4: unknown[] = [];
    const content4 = ["```", "CSS", "```"];
    content4.forEach((line, index) => {
      conversion4.handler(line, index + 1, (marks, isDefinition) => {
        res4.push({
          marks,
          isDefinition,
        });
      });
    });
    expect(res4).to.deep.eq([
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
    ]);

    const res5: unknown[] = [];
    const content5 = ["$$", "CSS", "$$"];
    content5.forEach((line, index) => {
      conversion4.handler(line, index + 1, (marks, isDefinition) => {
        res5.push({
          marks,
          isDefinition,
        });
      });
    });
    expect(res4).to.deep.eq([
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
      { marks: [], isDefinition: false },
    ]);
  });
});
