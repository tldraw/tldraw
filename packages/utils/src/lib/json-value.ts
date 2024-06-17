/** @public */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject
/** @public */
export type JsonPrimitive = boolean | null | string | number
/** @public */
export type JsonArray = JsonValue[]
/** @public */
export interface JsonObject {
	[key: string]: JsonValue | undefined
}
