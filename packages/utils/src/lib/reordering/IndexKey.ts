/**
 * A string made up of an integer part followed by a fraction part. The fraction point consists of
 * zero or more digits with no trailing zeros. Based on
 * {@link https://observablehq.com/@dgreensp/implementing-fractional-indexing}.
 *
 * @public
 */
export type IndexKey = string & { __orderKey: true }
