import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanTitle } from "./titles";

test("splits on a spaced hyphen", () => {
  assert.equal(
    cleanTitle("OUT OF TIME -FREDERICK LEONARD, SARIAN MARTIN"),
    "OUT OF TIME"
  );
});

test("splits on a hyphen with trailing space only", () => {
  assert.equal(
    cleanTitle("THE WEDDING PARTY- KELVIN IKEDUBA, MERCY JOHNSON"),
    "THE WEDDING PARTY"
  );
});

test("splits on a hyphen with leading space only", () => {
  assert.equal(cleanTitle("BLOOD SISTER -JIM IYKE"), "BLOOD SISTER");
});

test("splits on a fully glued hyphen", () => {
  assert.equal(
    cleanTitle("THE WEDDING PARTY-KELVIN IKEDUBA, MERCY JOHNSON"),
    "THE WEDDING PARTY"
  );
});

test("splits on a period separator", () => {
  assert.equal(cleanTitle("MOVIE TITLE. CAST NAME"), "MOVIE TITLE");
  assert.equal(cleanTitle("MOVIE TITLE.CAST NAME"), "MOVIE TITLE");
});

test("keeps common abbreviations' periods", () => {
  assert.equal(cleanTitle("DR. NO"), "DR. NO");
  assert.equal(cleanTitle("MRS. DALLOWAY"), "MRS. DALLOWAY");
});

test("keeps decimal numbers intact", () => {
  assert.equal(cleanTitle("APOLLO 13.5"), "APOLLO 13.5");
});

test("drops text after ! and removes the !", () => {
  assert.equal(cleanTitle("BIG MOVIE! CAST NAME"), "BIG MOVIE");
  assert.equal(cleanTitle("WOW!! MORE"), "WOW");
});

test("uses the earliest separator when several are present", () => {
  assert.equal(cleanTitle("TITLE -CAST! MORE"), "TITLE");
  assert.equal(cleanTitle("TITLE! CAST -NAME"), "TITLE");
});

test("preserves allow-listed hyphenated words (uppercased)", () => {
  assert.equal(cleanTitle("Spider-Man"), "SPIDER-MAN");
  assert.equal(cleanTitle("Ant-Man"), "ANT-MAN");
  assert.equal(cleanTitle("X-Men"), "X-MEN");
});

test("still splits after an allow-listed word when credits follow", () => {
  assert.equal(
    cleanTitle("Spider-Man-TOBEY MAGUIRE, KIRSTEN DUNST"),
    "SPIDER-MAN"
  );
});

test("returns the trimmed, uppercased original when there is no separator", () => {
  assert.equal(cleanTitle("  movie title  "), "MOVIE TITLE");
});

test("falls back to the original when the prefix is too short", () => {
  assert.equal(cleanTitle("-JIM IYKE"), "-JIM IYKE");
});

test("returns empty/falsy input unchanged", () => {
  assert.equal(cleanTitle(""), "");
});
