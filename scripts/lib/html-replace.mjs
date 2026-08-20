/**
 * Safe substitution helpers for HTML string surgery.
 *
 * `String.prototype.replace` treats `$&`, `` $` ``, `$'`, `$$` and `$<n>` as
 * substitution patterns inside a replacement STRING. Any page-derived value
 * spliced in that way — a title, a description, a JSON-LD blob, a rendered body
 * — can therefore rewrite itself using unrelated parts of the surrounding
 * document, silently and without error.
 *
 * Passing a replacer FUNCTION disables that expansion: whatever it returns is
 * inserted verbatim. These helpers exist so no caller has to remember that.
 *
 * Note this applies to string search patterns too, not only regexes:
 * `html.replace("</head>", value)` expands `$&` in `value` just the same.
 */

/** Wrap a value so `.replace()` inserts it verbatim, with no `$` expansion. */
export function literal(value) {
  return () => value;
}

/** `html.replace(pattern, value)` with `value` inserted verbatim. */
export function replaceLiteral(html, pattern, value) {
  return html.replace(pattern, literal(value));
}
