/**
 * parses a URL query string into a collection of key and value pairs
 *
 * @param qs The URL query string to parse
 * @param sep The substring used to delimit key and value pairs in the query string
 * @param eq The substring used to delimit keys and values in the query string
 * @param options.decodeURIComponent The function to use when decoding percent-encoded characters in the query string
 * @param options.maxKeys Specifies the maximum number of keys to parse. Specify 0 to remove key counting limitations default 1000
 */
export type decodeFuncType = (
  qs?: string,
  sep?: string,
  eq?: string,
  options?: {
    decodeURIComponent?: Function;
    maxKeys?: number;
  }
) => Record<any, unknown>;

export default decodeFuncType;
