import "mocha";
import { expect } from "chai";
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
      conversion1.handler(line, index + 1, (marks, definition) =>
        res1.push({
          marks,
          definition,
        }),
      );
    });
    expect(res1).to.deep.eq([
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [],
        definition: {
          key: "TEST",
          title: "CSS",
        },
      },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [],
        definition: {
          key: "CSS",
          title: "Cross Site Scripting",
        },
      },
    ]);

    const conversion2 = new Conversion(abbrList, false);
    const res2: unknown[] = [];
    content.forEach((line, index) => {
      conversion2.handler(line, index + 1, (marks, definition) =>
        res2.push({
          marks,
          definition,
        }),
      );
      res2.push();
    });
    expect(res2).to.deep.eq([
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [
          {
            index: 9,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      { marks: [], definition: null },
    ]);

    const conversion3 = new Conversion(abbrList, true, ["es"]);
    const res3: unknown[] = [];
    const content3 = ["---", "note:", "  - CSS: Test", "---", "CSS", "CSSes"];
    content3.forEach((line, index) => {
      conversion3.handler(line, index + 1, (marks, definition) =>
        res3.push({
          marks,
          definition,
        }),
      );
    });
    expect(res3).to.deep.eq([
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
      {
        marks: [
          {
            index: 0,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [
          {
            index: 0,
            text: "CSSes",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
    ]);

    const conversion4 = new Conversion(abbrList, true);
    conversion4.handler("test\tCSS", 1, (marks) => {
      expect(marks).to.deep.eq([
        {
          index: 5,
          text: "CSS",
          title: "Cascading Style Sheets",
          type: "global",
          key: "CSS",
        },
      ]);
    });

    const conversion5 = new Conversion(abbrList, true);
    const res5: unknown[] = [];
    const content5 = ["```", "CSS", "```"];
    content5.forEach((line, index) => {
      conversion5.handler(line, index + 1, (marks, definition) => {
        res5.push({
          marks,
          definition,
        });
      });
    });
    expect(res5).to.deep.eq([
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
    ]);

    const conversion6 = new Conversion(abbrList, true);
    const res6: unknown[] = [];
    const content6 = ["$$", "CSS", "$$"];
    content6.forEach((line, index) => {
      conversion6.handler(line, index + 1, (marks, definition) => {
        res6.push({
          marks,
          definition,
        });
      });
    });
    expect(res6).to.deep.eq([
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
    ]);

    const conversion7 = new Conversion(abbrList, true);
    const res7: unknown[] = [];
    const content7 = ["- CSS", "    + CSS", "        1. CSS"];
    content7.forEach((line, index) => {
      conversion7.handler(line, index + 1, (marks, definition) => {
        res7.push({
          marks,
          definition,
        });
      });
    });
    expect(res7).to.deep.eq([
      {
        marks: [
          {
            index: 2,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [
          {
            index: 6,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [
          {
            index: 11,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
    ]);

    const conversion8 = new Conversion(abbrList, true);
    const res8: unknown[] = [];
    const content8 = ["- CSS", "\t+ CSS", "\t* CSS"];
    content8.forEach((line, index) => {
      conversion8.handler(line, index + 1, (marks, definition) => {
        res8.push({
          marks,
          definition,
        });
      });
    });
    expect(res8).to.deep.eq([
      {
        marks: [
          {
            index: 2,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [
          {
            index: 3,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
      {
        marks: [
          {
            index: 3,
            text: "CSS",
            title: "Cascading Style Sheets",
            type: "global",
            key: "CSS",
          },
        ],
        definition: null,
      },
    ]);

    const conversion9 = new Conversion(abbrList, true);
    const res9: unknown[] = [];
    const content9 = ["    CSS", "\tCSS", "    \tCSS"];
    content9.forEach((line, index) => {
      conversion9.handler(line, index + 1, (marks, definition) => {
        res9.push({
          marks,
          definition,
        });
      });
    });
    expect(res9).to.deep.eq([
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
    ]);

    const conversion10 = new Conversion(abbrList, true);
    const res10: unknown[] = [];
    const content10 = ["````", "```", "CSS", "````"];
    content10.forEach((line, index) => {
      conversion10.handler(line, index + 1, (marks, definition) => {
        res10.push({
          marks,
          definition,
        });
      });
    });
    expect(res10).to.deep.eq([
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
      { marks: [], definition: null },
    ]);

    const conversion11 = new Conversion(
      [
        {
          key: "🛍️long",
          title: "Test",
          type: "global",
        },
      ],
      true,
    );
    const res11: unknown[] = [];
    const content11 = ["🛍️long 🛍️long emoji"];
    content11.forEach((line, index) => {
      conversion11.handler(line, index + 1, (marks, definition) => {
        res11.push({
          marks,
          definition,
        });
      });
    });
    expect(res11).to.deep.eq([
      {
        marks: [
          {
            index: 0,
            text: "🛍️long",
            title: "Test",
            type: "global",
            key: "🛍️long",
          },
          {
            index: 8,
            text: "🛍️long",
            title: "Test",
            type: "global",
            key: "🛍️long",
          },
        ],
        definition: null,
      },
    ]);
  });
});
