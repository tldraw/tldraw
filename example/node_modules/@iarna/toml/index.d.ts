import { Transform } from "stream";

type JsonArray = boolean[] | number[] | string[] | JsonMap[] | Date[]
type AnyJson = boolean | number | string | JsonMap | Date | JsonArray | JsonArray[]

interface JsonMap {
  [key: string]: AnyJson;
}

interface ParseOptions {
  /**
   * The amount text to parser per pass through the event loop. Defaults to 40kb (`40000`).
   */
  blocksize: number
}

interface FuncParse {
  /**
   * Synchronously parse a TOML string and return an object.
   */
  (toml: string): JsonMap

  /**
   * Asynchronously parse a TOML string and return a promise of the resulting object.
   */
  async (toml: string, options?: ParseOptions): Promise<JsonMap>

  /**
   * Given a readable stream, parse it as it feeds us data. Return a promise of the resulting object.
   */
  stream (readable: NodeJS.ReadableStream): Promise<JsonMap>
  stream (): Transform
}

interface FuncStringify {
  /**
   * Serialize an object as TOML.
   *
   * If an object `TOML.stringify` is serializing has a `toJSON` method
   * then it will call it to transform the object before serializing it.
   * This matches the behavior of JSON.stringify.
   *
   * The one exception to this is that `toJSON` is not called for `Date` objects
   * because JSON represents dates as strings and TOML can represent them natively.
   *
   * `moment` objects are treated the same as native `Date` objects, in this respect.
   */
  (obj: JsonMap): string

  /**
   * Serialize a value as TOML would. This is a fragment and not a complete valid TOML document.
   */
  value (any: AnyJson): string
}

export const parse: FuncParse
export const stringify: FuncStringify
