/**
 * A type that represents any valid JSON value. This includes primitives (boolean, null, string, number),
 * arrays of JSON values, and objects with string keys and JSON values.
 *
 * @example
 * ```ts
 * const jsonData: JsonValue = {
 *   name: "Alice",
 *   age: 30,
 *   active: true,
 *   tags: ["user", "premium"],
 *   metadata: null
 * }
 * ```
 *
 * @public
 */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject

/**
 * A type representing JSON primitive values: boolean, null, string, or number.
 * These are the atomic values that can appear in JSON data.
 *
 * @example
 * ```ts
 * const primitives: JsonPrimitive[] = [
 *   true,
 *   null,
 *   "hello",
 *   42
 * ]
 * ```
 *
 * @public
 */
export type JsonPrimitive = boolean | null | string | number

/**
 * A type representing a JSON array containing any valid JSON values.
 * Arrays can contain mixed types of JSON values including nested arrays and objects.
 *
 * @example
 * ```ts
 * const jsonArray: JsonArray = [
 *   "text",
 *   123,
 *   true,
 *   { nested: "object" },
 *   [1, 2, 3]
 * ]
 * ```
 *
 * @public
 */
export type JsonArray = JsonValue[]

/**
 * A type representing a JSON object with string keys and JSON values.
 * Object values can be undefined to handle optional properties safely.
 *
 * @example
 * ```ts
 * const jsonObject: JsonObject = {
 *   required: "value",
 *   optional: undefined,
 *   nested: {
 *     deep: "property"
 *   },
 *   array: [1, 2, 3]
 * }
 * ```
 *
 * @public
 */
export interface JsonObject {
	[key: string]: JsonValue | undefined
}
