/**
 * It serializes passed object into string
 * The numeric values must be finite.
 * Any other input values will be coerced to empty strings.
 *
 * @param obj The object to serialize into a URL query string
 * @param sep The substring used to delimit key and value pairs in the query string
 * @param eq The substring used to delimit keys and values in the query string
 * @param name
 */
export type encodeFuncType = (
  obj?: Record<any, unknown>,
  sep?: string,
  eq?: string,
  name?: any
) => string;

export default encodeFuncType;
