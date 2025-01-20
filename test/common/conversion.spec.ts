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
  });
});
