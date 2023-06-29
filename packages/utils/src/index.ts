export { compact, dedupe, last, minBy, partition, rotateArray } from './lib/array'
export {
	Result,
	assert,
	assertExists,
	exhaustiveSwitchError,
	promiseWithResolve,
	type ErrorResult,
	type OkResult,
} from './lib/control'
export { debounce } from './lib/debounce'
export { annotateError, getErrorAnnotations } from './lib/error'
export { noop, omitFromStackTrace, throttle } from './lib/function'
export { getHashForObject, getHashForString, lns } from './lib/hash'
export { getFirstFromIterable } from './lib/iterable'
export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from './lib/json-value'
export { lerp, modulate, rng } from './lib/number'
export {
	deepCopy,
	filterEntries,
	getOwnProperty,
	hasOwnProperty,
	mapObjectMapValues,
	objectMapEntries,
	objectMapFromEntries,
	objectMapKeys,
	objectMapValues,
} from './lib/object'
export { rafThrottle, throttledRaf } from './lib/raf'
export { sortById } from './lib/sort'
export type { Expand, RecursivePartial, Required } from './lib/types'
export { isDefined, isNonNull, isNonNullish, structuredClone } from './lib/value'
