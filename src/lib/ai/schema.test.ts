import assert from "node:assert/strict";
import { test } from "node:test";

import { parseClassification, validateAgainstTaxonomy } from "./schema";

test("parseClassification drops unknown shapes and trims values", () => {
  const parsed = parseClassification({
    primaryCategorySlug: "  technology  ",
    secondaryCategorySlugs: ["science", 42, "  business "],
    description: "A show",
    tags: ["ai", "", "startups"],
    languageCode: "en",
    countryCode: null,
    rationale: "Because",
    uncertainties: ["unknown owner"]
  });
  assert.ok(parsed);
  assert.equal(parsed?.primaryCategorySlug, "technology");
  assert.deepEqual(parsed?.secondaryCategorySlugs, ["science", "business"]);
  assert.deepEqual(parsed?.tags, ["ai", "startups"]);
});

test("parseClassification returns null for non-objects", () => {
  assert.equal(parseClassification("nope"), null);
  assert.equal(parseClassification(null), null);
  assert.equal(parseClassification(42), null);
});

test("validateAgainstTaxonomy drops unknown slugs and clears bad primary", () => {
  const allowed = new Set(["technology", "business"]);
  const result = validateAgainstTaxonomy(
    {
      primaryCategorySlug: "not-real",
      secondaryCategorySlugs: ["technology", "ghost", "business"],
      description: null,
      tags: [],
      languageCode: null,
      countryCode: null,
      rationale: "",
      uncertainties: []
    },
    allowed
  );
  assert.equal(result.primaryCategorySlug, null);
  assert.deepEqual(result.secondaryCategorySlugs, ["technology", "business"]);
});

test("validateAgainstTaxonomy keeps valid primary and excludes it from secondary", () => {
  const allowed = new Set(["technology", "business"]);
  const result = validateAgainstTaxonomy(
    {
      primaryCategorySlug: "technology",
      secondaryCategorySlugs: ["technology", "business"],
      description: null,
      tags: [],
      languageCode: null,
      countryCode: null,
      rationale: "",
      uncertainties: []
    },
    allowed
  );
  assert.equal(result.primaryCategorySlug, "technology");
  assert.deepEqual(result.secondaryCategorySlugs, ["business"]);
});
