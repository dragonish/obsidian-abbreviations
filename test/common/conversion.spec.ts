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
      "  - HTML: HyperText Markup Language",
      "---",
      "CSS",
      "*[TEST]: CSS",
      "CSS",
      "*[CSS]: Cross Site Scripting",
    ];

    const conversion1 = new Conversion(abbrList, true);
    const res1: unknown[] = [];
    content.forEach((line, index) => {
      res1.push(conversion1.handler(line, index + 1));
    });
    expect(res1).to.deep.eq([
      [],
      [],
      [],
      [],
      [
        {
          index: 0,
          text: "CSS",
          title: "Cascading Style Sheets",
        },
      ],
      [],
      [
        {
          index: 0,
          text: "CSS",
          title: "Cascading Style Sheets",
        },
      ],
      [],
    ]);

    const conversion2 = new Conversion(abbrList, false);
    const res2: unknown[] = [];
    content.forEach((line, index) => {
      res2.push(conversion2.handler(line, index + 1));
    });
    expect(res2).to.deep.eq([
      [],
      [],
      [],
      [],
      [
        {
          index: 0,
          text: "CSS",
          title: "Cascading Style Sheets",
        },
      ],
      [
        {
          index: 9,
          text: "CSS",
          title: "Cascading Style Sheets",
        },
      ],
      [
        {
          index: 0,
          text: "CSS",
          title: "Cascading Style Sheets",
        },
      ],
      [],
    ]);
  });
});
