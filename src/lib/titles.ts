/**
 * Clean a movie title for display.
 *
 * Catalogue titles often carry cast/credit suffixes after a hyphen, e.g.
 * "OUT OF TIME -FREDERICK LEONARD, SARIAN MARTIN" or
 * "THE WEDDING PARTY-KELVIN IKEDUBA, MERCY JOHNSON". For a cleaner grid we
 * show only the part before the first such hyphen. The full title is preserved
 * in the database; this only affects what is rendered.
 *
 * A hyphen is treated as a separator when it is:
 *   - surrounded by whitespace on either side (" - ", " -", "- "), or
 *   - glued to the words on both sides ("Title-Cast").
 *
 * Glued hyphens are ambiguous: "Spider-Man" is a real hyphenated word, not a
 * credits separator. To avoid mangling those, a small allow-list of known
 * hyphenated words (see HYPHENATED_WORDS) is preserved.
 */

/**
 * Real hyphenated words that must never be split, keyed by lowercase form.
 * Add to this list when a title is being incorrectly truncated.
 */
const HYPHENATED_WORDS = new Set([
  "spider-man",
  "ant-man",
  "iron-man",
  "x-men",
  "t-34",
  "f-16"
]);

/**
 * A hyphen used as a separator: either surrounded by whitespace, or glued on
 * both sides (no whitespace). We scan left to right and return the first match
 * that is not part of an allow-listed hyphenated word.
 */
const SEPARATOR_HYPHEN = /\s+-\s*|\s*-\s+|-/g;

function isAllowedHyphen(raw: string, index: number): boolean {
  // Look at the word immediately before the hyphen and the word immediately
  // after it, and compare just that pair against the allow-list. This keeps
  // "Spider-Man" intact even when more credits follow ("Spider-Man-TOBEY...").
  let leftStart = index;
  while (leftStart > 0 && !/[\s-]/.test(raw[leftStart - 1])) leftStart -= 1;
  const left = raw.slice(leftStart, index);

  let rightEnd = index + 1;
  while (rightEnd < raw.length && !/[\s-]/.test(raw[rightEnd])) rightEnd += 1;
  const right = raw.slice(index + 1, rightEnd);

  if (!left || !right) return false;
  return HYPHENATED_WORDS.has(`${left}-${right}`.toLowerCase());
}

/**
 * Common abbreviations whose trailing period must NOT be treated as a
 * separator (kept as part of the word). Compared case-insensitively against
 * the token immediately before the dot.
 */
const ABBREVIATIONS = new Set([
  "dr",
  "mrs",
  "mr",
  "ms",
  "miss",
  "prof",
  "st",
  "jr",
  "sr",
  "vs",
  "vol",
  "no",
  "etc",
  "inc",
  "ltd",
  "co",
  "dept",
  "est"
]);

/**
 * Index of the first period that acts as a separator, or -1 when none does.
 * A period is NOT a separator when:
 *   - the token immediately before it is a known abbreviation (Dr., Mrs., …),
 *   - it sits inside a number (e.g. "2.5").
 */
function firstSeparatorPeriod(raw: string): number {
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] !== ".") continue;

    const prev = raw[i - 1] ?? "";
    const next = raw[i + 1] ?? "";

    // Decimal number: digit.digit -> not a separator.
    if (/\d/.test(prev) && /\d/.test(next)) continue;

    // Abbreviation: the word immediately before the dot is allow-listed.
    let start = i;
    while (start > 0 && /[A-Za-z]/.test(raw[start - 1])) start -= 1;
    const word = raw.slice(start, i).toLowerCase();
    if (word && ABBREVIATIONS.has(word)) continue;

    return i;
  }
  return -1;
}

/**
 * Truncate raw at the earliest separator (hyphen, period, or exclamation),
 * keeping the part before it. The separator itself is dropped.
 */
function truncateAtSeparator(raw: string): string {
  // Collect the earliest separator index from each rule; the smallest wins.
  let cut = -1;

  // Exclamation mark: always a separator.
  const bang = raw.indexOf("!");
  if (bang !== -1) cut = bang;

  // Hyphen: a separator unless it is part of an allow-listed hyphenated word.
  SEPARATOR_HYPHEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SEPARATOR_HYPHEN.exec(raw)) !== null) {
    const glued = !/\s/.test(match[0]);
    if (glued && isAllowedHyphen(raw, match.index)) continue;
    if (cut === -1 || match.index < cut) cut = match.index;
    break;
  }

  // Period, unless it is part of an abbreviation or a number.
  const periodIndex = firstSeparatorPeriod(raw);
  if (periodIndex !== -1 && (cut === -1 || periodIndex < cut)) cut = periodIndex;

  if (cut === -1) return raw.trim();
  const head = raw.slice(0, cut).trim();
  // Fall back to the original if the prefix is empty or too short to be useful.
  if (head.length < 2) return raw.trim();
  return head;
}

/**
 * Clean a movie title for display: drop cast/credit suffixes and render in
 * ALL CAPS.
 */
export function cleanTitle(raw: string): string {
  if (!raw) return raw;
  return truncateAtSeparator(raw).toUpperCase();
}

/**
 * Format an ISO publish date as e.g. "Jan 5, 2026" (first letter capped, rest
 * lower). Returns null when the input is missing/invalid.
 */
export function formatPublishedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}
