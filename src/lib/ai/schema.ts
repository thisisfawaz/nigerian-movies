/**
 * AI classification output schema (PRD §7.3).
 *
 * Output is validated against the live category taxonomy before use. The model
 * never creates categories and never invents facts.
 */

export interface AiClassification {
  /** Primary category slug, or null when uncertain. */
  primaryCategorySlug: string | null;
  /** Secondary category slugs. */
  secondaryCategorySlugs: string[];
  /** Short catalogue description, or null when insufficient info. */
  description: string | null;
  /** Relevant search tags. */
  tags: string[];
  /** ISO language code when reliably inferable. */
  languageCode: string | null;
  /** Country/region only when supported by evidence. */
  countryCode: string | null;
  /** Explanation of the classification. */
  rationale: string;
  /** Missing information or uncertainties. */
  uncertainties: string[];
}

/** The set of category slugs the model is allowed to choose from. */
export interface ClassificationContext {
  channelName: string;
  channelDescription: string | null;
  notes: string | null;
  allowedCategories: Array<{ slug: string; name: string }>;
}

/**
 * Defensive parse of arbitrary model output into a trusted shape.
 * Anything unrecognized is dropped; nothing is trusted blindly.
 */
export function parseClassification(raw: unknown): AiClassification | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const asString = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim())
          .filter((x) => x.length > 0)
      : [];

  return {
    primaryCategorySlug: asString(obj.primaryCategorySlug),
    secondaryCategorySlugs: asStringArray(obj.secondaryCategorySlugs),
    description: asString(obj.description),
    tags: asStringArray(obj.tags).slice(0, 8),
    languageCode: asString(obj.languageCode),
    countryCode: asString(obj.countryCode),
    rationale: asString(obj.rationale) ?? "",
    uncertainties: asStringArray(obj.uncertainties)
  };
}

/**
 * Validate the model's category choices against the real taxonomy.
 * Unknown slugs are dropped; the primary is cleared if it is not allowed.
 */
export function validateAgainstTaxonomy(
  classification: AiClassification,
  allowedSlugs: Set<string>
): AiClassification {
  const primary =
    classification.primaryCategorySlug &&
    allowedSlugs.has(classification.primaryCategorySlug)
      ? classification.primaryCategorySlug
      : null;

  const secondary = Array.from(
    new Set(
      classification.secondaryCategorySlugs.filter(
        (slug) => allowedSlugs.has(slug) && slug !== primary
      )
    )
  );

  return { ...classification, primaryCategorySlug: primary, secondaryCategorySlugs: secondary };
}
