import "mocha";
import { expect } from "chai";
import { Conversion } from "../../common/conversion";

describe("common/conversion", function () {
  it("Conversion", function () {
    const conversion = new Conversion([], "abbr");

    expect(conversion.abbreviations).to.be.empty;

    conversion.readAbbreviationsFromCache({
      abbr: ["HTML: HyperText Markup Language"],
    });

    expect(conversion.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
    ]);

    conversion.readAbbreviationsFromCache({
      tags: ["CSS: Cascading Style Sheets"],
    });

    expect(conversion.abbreviations).to.deep.eq([
      {
        key: "HTML",
        title: "HyperText Markup Language",
      },
    ]);
  });
});
