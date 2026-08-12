/** Splits a string on `$...$` math delimiters. Capturing group keeps the
 *  math source in the split output, alternating [text, math, text, math, ...]. */
export const MATH_SEGMENT_REGEX = /\$([^$]+)\$/g;

/** `\$` escapes a literal dollar sign (e.g. currency amounts) so it isn't
 *  mistaken for a math delimiter. Swapped for this placeholder (a Unicode
 *  private-use codepoint that won't otherwise appear in question text)
 *  before splitting, then back to `$` in the resulting plain-text segments. */
export const ESCAPED_DOLLAR_REGEX = /\\\$/g;
export const ESCAPED_DOLLAR_PLACEHOLDER = '';
export const ESCAPED_DOLLAR_PLACEHOLDER_REGEX = //g;
