import { registerTldrawLibraryVersion } from './lib/version'

export { default as isEqual } from 'lodash.isequal'
export { default as isEqualWith } from 'lodash.isequalwith'
export { default as throttle } from 'lodash.throttle'
export { default as uniq } from 'lodash.uniq'
export {
	areArraysShallowEqual,
	compact,
	dedupe,
	last,
	maxBy,
	mergeArraysAndReplaceDefaults,
	minBy,
	partition,
	rotateArray,
} from './lib/array'
export { bind } from './lib/bind'
export { WeakCache } from './lib/cache'
export {
	assert,
	assertExists,
	exhaustiveSwitchError,
	promiseWithResolve,
	Result,
	sleep,
	type ErrorResult,
	type OkResult,
} from './lib/control'
export { debounce } from './lib/debounce'
export { annotateError, getErrorAnnotations, type ErrorAnnotations } from './lib/error'
export { ExecutionQueue } from './lib/ExecutionQueue'
export { FileHelpers } from './lib/file'
export { noop, omitFromStackTrace } from './lib/function'
export { getHashForBuffer, getHashForObject, getHashForString, lns } from './lib/hash'
export { mockUniqueId, restoreUniqueId, uniqueId } from './lib/id'
export { getFirstFromIterable } from './lib/iterable'
export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from './lib/json-value'
export {
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
	DEFAULT_SUPPORTED_MEDIA_TYPES,
	MediaHelpers,
} from './lib/media/media'
export { PngHelpers } from './lib/media/png'
export { fetch, Image } from './lib/network'
export { invLerp, lerp, modulate, rng } from './lib/number'
export {
	areObjectsShallowEqual,
	filterEntries,
	getChangedKeys,
	getOwnProperty,
	groupBy,
	hasOwnProperty,
	isEqualAllowingForFloatingPointErrors,
	mapObjectMapValues,
	objectMapEntries,
	objectMapEntriesIterable,
	objectMapFromEntries,
	objectMapKeys,
	objectMapValues,
	omit,
} from './lib/object'
export { measureAverageDuration, measureCbDuration, measureDuration } from './lib/perf'
export { PerformanceTracker } from './lib/PerformanceTracker'
export {
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	getIndices,
	getIndicesAbove,
	getIndicesBelow,
	getIndicesBetween,
	sortByIndex,
	validateIndexKey,
	ZERO_INDEX_KEY,
	type IndexKey,
} from './lib/reordering'
export { retry } from './lib/retry'
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
export { stringEnum } from './lib/stringEnum'
export { fpsThrottle, throttleToNextFrame } from './lib/throttle'
export { Timers } from './lib/timers'
export {
	type Expand,
	type MakeUndefinedOptional,
	type RecursivePartial,
	type Required,
} from './lib/types'
export { safeParseUrl } from './lib/url'
export {
	isDefined,
	isNativeStructuredClone,
	isNonNull,
	isNonNullish,
	STRUCTURED_CLONE_OBJECT_PROTOTYPE,
	structuredClone,
} from './lib/value'
export { registerTldrawLibraryVersion } from './lib/version'
export { warnDeprecatedGetter, warnOnce } from './lib/warn'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
