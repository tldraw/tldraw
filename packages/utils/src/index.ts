export { default as throttle } from 'lodash.throttle'
export { default as uniq } from 'lodash.uniq'
export { PerformanceTracker } from './lib/PerformanceTracker'
export {
	areArraysShallowEqual,
	compact,
	dedupe,
	last,
	minBy,
	partition,
	rotateArray,
} from './lib/array'
export { WeakCache } from './lib/cache'
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
export { annotateError, getErrorAnnotations, type ErrorAnnotations } from './lib/error'
export { FileHelpers } from './lib/file'
export { noop, omitFromStackTrace } from './lib/function'
export { getHashForBuffer, getHashForObject, getHashForString, lns } from './lib/hash'
export { getFirstFromIterable } from './lib/iterable'
export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from './lib/json-value'
export {
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	MediaHelpers,
} from './lib/media/media'
export { PngHelpers } from './lib/media/png'
export { Image, fetch } from './lib/network'
export { invLerp, lerp, modulate, rng } from './lib/number'
export {
	areObjectsShallowEqual,
	filterEntries,
	getOwnProperty,
	hasOwnProperty,
	mapObjectMapValues,
	objectMapEntries,
	objectMapFromEntries,
	objectMapKeys,
	objectMapValues,
} from './lib/object'
export { measureAverageDuration, measureCbDuration, measureDuration } from './lib/perf'
export { type IndexKey } from './lib/reordering/IndexKey'
export {
	ZERO_INDEX_KEY,
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	getIndices,
	getIndicesAbove,
	getIndicesBelow,
	getIndicesBetween,
	sortByIndex,
	validateIndexKey,
} from './lib/reordering/reordering'
export { sortById } from './lib/sort'
export {
	clearLocalStorage,
	clearSessionStorage,
	deleteFromLocalStorage,
	deleteFromSessionStorage,
	getFromLocalStorage,
	getFromSessionStorage,
	setInLocalStorage,
	setInSessionStorage,
} from './lib/storage'
export { fpsThrottle, throttleToNextFrame } from './lib/throttle'
export { Timers } from './lib/timers'
export type { Expand, RecursivePartial, Required } from './lib/types'
export {
	STRUCTURED_CLONE_OBJECT_PROTOTYPE,
	isDefined,
	isNativeStructuredClone,
	isNonNull,
	isNonNullish,
	structuredClone,
} from './lib/value'
export { warnDeprecatedGetter, warnOnce } from './lib/warn'
