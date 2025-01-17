import "mocha";
import { expect } from "chai";
import { getMetadata } from "../../common/metadata";

describe("common/metadata", function () {
  it("getMetadata", function () {
    expect(getMetadata("")).to.be.null;
    expect(getMetadata(" ")).to.be.null;
    expect(getMetadata("1")).to.be.null;
    expect(getMetadata('"1"')).to.be.null;

    expect(getMetadata("[]")).to.be.empty;
    expect(getMetadata("[")).to.be.null;
    expect(getMetadata("-")).to.deep.eq([null]);
    expect(getMetadata("- a")).to.deep.eq(["a"]);
    expect(getMetadata("a:")).to.deep.eq({ a: null });
    expect(getMetadata("a: 1")).to.deep.eq({ a: 1 });
    expect(getMetadata("a: test")).to.deep.eq({ a: "test" });
    expect(getMetadata(["a:", " - b: c"].join("\n"))).to.deep.eq({
      a: [{ b: "c" }],
    });

    expect(getMetadata("{}")).to.be.empty;
    expect(getMetadata("{")).to.be.null;
    expect(getMetadata('{a: [b: "c"]}')).to.deep.eq({
      a: [{ b: "c" }],
    });
  });
});
