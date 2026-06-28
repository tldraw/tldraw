import { atom } from '@tldraw/state'
import { fetch } from '@tldraw/utils'
import { VecLike } from '../../primitives/Vec'

// Loader for the Rust/WASM port of the freehand ink generators. The module ships as a
// `freehand.wasm` asset next to this file and is loaded at runtime via
// `new URL('./freehand.wasm', import.meta.url)` — fetched in the browser, read from disk in
// Node. It exports a linear `memory` plus a few functions and has zero host imports.
//
// Because the load is async but freehand generation runs synchronously during render, the
// load is kicked off eagerly at import and a reactive readiness signal lets ink/geometry
// re-render once the module is ready (the same way fonts swap in when they load).
//
// This lives in @tldraw/editor (the lowest package that needs freehand path generation, via
// getSvgPathFromPoints); the tldraw package's freehand helpers call into it.
//
// ABI:
//   points_ptr(nFloats) -> ptr      ensure the input buffer holds nFloats, return its pointer
//   svg_ink(n, size, thinning, smoothing, streamline, simulatePressure, easing, last)
//                                   -> byte length of the ink (dash 'draw') path
//   svg_from_points(n, ..., closed) -> byte length of the centerline (solid/fill) path
//   get_svg_path_from_points(n, closed) -> byte length of the quadratic-midpoint path
//   last_point_count() -> count     streamlined point count from the most recent ingest
//   output_ptr() -> ptr             pointer to the generated path bytes
//
// Points are written interleaved [x, y, z, ...] (z = pressure). Buffers are reused and
// non-reentrant, exactly like the JS pipeline — one call fully consumes them.

/**
 * The subset of perfect-freehand's StrokeOptions the WASM port reads. Declared structurally
 * so callers can pass their own StrokeOptions without a type dependency on this package.
 *
 * @internal
 */
export interface FreehandStrokeOptions {
	size?: number
	thinning?: number
	smoothing?: number
	streamline?: number
	easing?(pressure: number): number
	simulatePressure?: boolean
	start?: { cap?: boolean; taper?: number | boolean; easing?(distance: number): number }
	end?: { cap?: boolean; taper?: number | boolean; easing?(distance: number): number }
	last?: boolean
}

interface FreehandWasmExports {
	memory: WebAssembly.Memory
	points_ptr(nFloats: number): number
	svg_ink(
		nPoints: number,
		size: number,
		thinning: number,
		smoothing: number,
		streamline: number,
		simulatePressure: number,
		easing: number,
		last: number
	): number
	svg_from_points(
		nPoints: number,
		size: number,
		thinning: number,
		smoothing: number,
		streamline: number,
		simulatePressure: number,
		easing: number,
		last: number,
		closed: number
	): number
	get_svg_path_from_points(nPoints: number, closed: number): number
	stroke_points(
		nPoints: number,
		size: number,
		thinning: number,
		smoothing: number,
		streamline: number,
		simulatePressure: number,
		easing: number,
		last: number
	): number
	get_stroke(
		nPoints: number,
		size: number,
		thinning: number,
		smoothing: number,
		streamline: number,
		simulatePressure: number,
		easing: number,
		last: number,
		taperStart: number,
		taperEnd: number,
		taperStartEase: number,
		taperEndEase: number,
		capStart: number,
		capEnd: number
	): number
	stroke_outline_from_points(
		nPoints: number,
		size: number,
		smoothing: number,
		last: number,
		taperStart: number,
		taperEnd: number,
		taperStartEase: number,
		taperEndEase: number,
		capStart: number,
		capEnd: number
	): number
	svg_path_from_stroke_points(nPoints: number, closed: number): number
	last_point_count(): number
	output_ptr(): number
	out_f64_ptr(): number
	easing_lut_ptr(): number
}

// Easing ids understood by the Rust port — the known easings the SDK uses. A custom easing
// (one this can't identify) is instead sampled into a lookup table (see resolveEasingSlot).
const EASING_LINEAR = 0
const EASING_OUT_SINE = 1
const EASING_PEN = 2
const EASING_OUT_QUAD = 3
const EASING_OUT_CUBIC = 4
const EASING_IN_OUT_SINE = 5
// LUT sentinel ids, paired with a sampled table in the easing_lut buffer (slots 0/1/2).
const EASING_LUT_MAIN = 100
const EASING_LUT_TAPER_START = 101
const EASING_LUT_TAPER_END = 102
const EASING_LUT_SIZE = 1024

let exportsCache: FreehandWasmExports | null = null
let instantiateFailed = false
let loadPromise: Promise<boolean> | null = null
const textDecoder = new TextDecoder()

// Reactive readiness flag. Freehand generation runs synchronously during render, but the
// module loads asynchronously (the ~70KB asset is fetched, not inlined). Callers read this
// signal so that ink/geometry produced before the module is ready re-render reactively once
// it loads — the same way fonts swap in when they finish loading.
const isFreehandWasmReady = atom('isFreehandWasmReady', false)

// Resolved against this module's location so bundlers (Vite/webpack) emit the asset and Node
// gets a file: URL. The cast keeps TS happy about the BufferSource shape later.
const wasmUrl = /* @__PURE__ */ new URL('./freehand.wasm', import.meta.url)

function instantiate(bytes: BufferSource): FreehandWasmExports {
	const wasmModule = new WebAssembly.Module(bytes)
	const instance = new WebAssembly.Instance(wasmModule, {})
	return instance.exports as unknown as FreehandWasmExports
}

/**
 * Load and instantiate the freehand WASM module. Idempotent and safe to call repeatedly; it
 * is kicked off eagerly at import time so the module is usually ready before the first stroke
 * renders. In Node (a `file:` URL) it reads the asset from disk; in the browser it fetches it.
 * Resolves to true once the module is ready, or false if the environment can't run it.
 *
 * @internal
 */
export function loadFreehandWasm(): Promise<boolean> {
	if (loadPromise) return loadPromise
	loadPromise = (async () => {
		try {
			if (exportsCache) return true
			let bytes: BufferSource
			if (wasmUrl.protocol === 'file:') {
				// Node / SSR. The specifier is a variable so browser bundlers don't try to
				// resolve node:fs into the client build.
				const fsSpecifier = 'node:fs/promises'
				const { readFile } = await import(/* @vite-ignore */ fsSpecifier)
				bytes = await readFile(wasmUrl)
			} else {
				const response = await fetch(wasmUrl)
				bytes = await response.arrayBuffer()
			}
			if (!exportsCache) {
				exportsCache = instantiate(bytes)
				isFreehandWasmReady.set(true)
			}
			return true
		} catch {
			instantiateFailed = true
			return false
		}
	})()
	return loadPromise
}

/**
 * Instantiate the module from bytes already in hand, bypassing the asset fetch. Used by the
 * test harness, where the bundler's `new URL(..., import.meta.url)` asset resolution isn't
 * available. No-op if the module is already loaded.
 *
 * @internal
 */
export function instantiateFreehandWasm(bytes: BufferSource): void {
	if (exportsCache) return
	try {
		exportsCache = instantiate(bytes)
		isFreehandWasmReady.set(true)
	} catch {
		instantiateFailed = true
	}
}

// Start loading as soon as this module is imported.
void loadFreehandWasm()

/**
 * The module's exports if it has finished loading, else null. Reads the reactive readiness
 * signal so callers inside a reactive context (render, computed geometry) re-run when the
 * module becomes available.
 */
function tryGetFreehandWasm(): FreehandWasmExports | null {
	isFreehandWasmReady.get()
	if (exportsCache) return exportsCache
	if (!loadPromise && !instantiateFailed) void loadFreehandWasm()
	return null
}

/**
 * Map a stroke's easing function to a WASM easing id by sampling it at known inputs. Returns
 * -1 for easings the port doesn't implement, signalling the caller to fall back to JS.
 */
function resolveEasingId(easing: FreehandStrokeOptions['easing']): number {
	if (!easing) return EASING_LINEAR // computeRadii's default easing is the identity
	const a = easing(0.25)
	const b = easing(0.6)
	const near = (x: number, y: number) => Math.abs(x - y) < 1e-9
	if (near(a, 0.25) && near(b, 0.6)) return EASING_LINEAR
	const sine = (t: number) => Math.sin((t * Math.PI) / 2)
	if (near(a, sine(0.25)) && near(b, sine(0.6))) return EASING_OUT_SINE
	const pen = (t: number) => t * 0.65 + sine(t) * 0.35
	if (near(a, pen(0.25)) && near(b, pen(0.6))) return EASING_PEN
	if (near(a, 0.25 * (2 - 0.25)) && near(b, 0.6 * (2 - 0.6))) return EASING_OUT_QUAD
	const cubic = (t: number) => (t - 1) ** 3 + 1
	if (near(a, cubic(0.25)) && near(b, cubic(0.6))) return EASING_OUT_CUBIC
	const inOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
	if (near(a, inOutSine(0.25)) && near(b, inOutSine(0.6))) return EASING_IN_OUT_SINE
	return -1
}

/**
 * Resolve an easing for one of the WASM easing slots. Returns a known easing id when it can
 * identify the function (or the default when none is given); otherwise samples the function
 * into the slot's lookup table and returns the LUT sentinel id. `slotIndex` is 0 (main), 1
 * (taper start) or 2 (taper end).
 */
function resolveEasingSlot(
	wasm: FreehandWasmExports,
	easing: FreehandStrokeOptions['easing'],
	slotIndex: number,
	lutSentinel: number,
	defaultId: number
): number {
	const id = easing ? resolveEasingId(easing) : defaultId
	if (id !== -1) return id
	const lutPtr = wasm.easing_lut_ptr()
	const lut = new Float64Array(
		wasm.memory.buffer,
		lutPtr + slotIndex * EASING_LUT_SIZE * 8,
		EASING_LUT_SIZE
	)
	for (let i = 0; i < EASING_LUT_SIZE; i++) lut[i] = easing!(i / (EASING_LUT_SIZE - 1))
	return lutSentinel
}

/** Encode a taper option for the ABI: 0 = none, Infinity = `true` (full), else the distance. */
function taperValue(taper: number | boolean | undefined): number {
	if (!taper) return 0
	if (taper === true) return Infinity
	return taper
}

/** Read `count` floats from the f64 output buffer as a fresh copy (the buffer is reused). */
function readF64Output(wasm: FreehandWasmExports, count: number): Float64Array {
	const ptr = wasm.out_f64_ptr()
	return new Float64Array(wasm.memory.buffer, ptr, count).slice()
}

/**
 * Returns true if `options` can be handled by the WASM port: round caps, no taper, and one
 * of the known easings. Anything else should use the JS implementations.
 *
 * @internal
 */
export function canUseFreehandWasm(options: FreehandStrokeOptions): boolean {
	const { start = {}, end = {} } = options
	if (start.taper || end.taper) return false
	if (start.cap === false || end.cap === false) return false
	return resolveEasingId(options.easing) !== -1
}

/** Write the raw input points into wasm memory as interleaved [x, y, z]. */
function writePoints(wasm: FreehandWasmExports, rawInputPoints: VecLike[]): number {
	const n = rawInputPoints.length
	// Re-read the buffer view after points_ptr (it may have grown memory, detaching old views).
	const ptr = wasm.points_ptr(n * 3)
	const floats = new Float64Array(wasm.memory.buffer, ptr, n * 3)
	for (let i = 0; i < n; i++) {
		const p = rawInputPoints[i]
		floats[i * 3] = p.x
		floats[i * 3 + 1] = p.y
		floats[i * 3 + 2] = p.z ?? 1
	}
	return n
}

/** Read `len` bytes of the output buffer back as a string. */
function readOutput(wasm: FreehandWasmExports, len: number): string {
	const outPtr = wasm.output_ptr()
	const bytes = new Uint8Array(wasm.memory.buffer, outPtr, len)
	return textDecoder.decode(bytes)
}

/**
 * WASM port of `svgInk`: raw input points to an SVG ink path (the draw shape's `dash: 'draw'`
 * render) in a single pass. Byte-for-byte identical to JS `svgInk` for supported options.
 * Returns `null` when the options aren't supported or the module can't run.
 *
 * @internal
 */
export function svgInkWasm(
	rawInputPoints: VecLike[],
	options: FreehandStrokeOptions = {}
): string | null {
	const easingId = resolveEasingId(options.easing)
	if (easingId === -1 || !canUseFreehandWasm(options)) return null
	try {
		const wasm = tryGetFreehandWasm()
		if (!wasm) return null
		const n = rawInputPoints.length
		if (n === 0) return ''
		writePoints(wasm, rawInputPoints)
		const {
			size = 16,
			thinning = 0.5,
			smoothing = 0.5,
			streamline = 0.5,
			simulatePressure = false,
			last = false,
		} = options
		const len = wasm.svg_ink(
			n,
			size,
			thinning,
			smoothing,
			streamline,
			simulatePressure ? 1 : 0,
			easingId,
			last ? 1 : 0
		)
		return readOutput(wasm, len)
	} catch {
		instantiateFailed = true
		return null
	}
}

/**
 * WASM port of getSvgPathFromStrokePoints(getStrokePoints(points, options), closed): the
 * solid/fill centerline path used by draw and highlight rendering. Returns the path string
 * plus the streamlined point count (equal to getStrokePoints length, for the caller's dot
 * decision), or null when unsupported or the module can't run.
 *
 * @internal
 */
export function svgFromPointsWasm(
	rawInputPoints: VecLike[],
	options: FreehandStrokeOptions = {},
	closed = false
): { path: string; pointCount: number } | null {
	const easingId = resolveEasingId(options.easing)
	if (easingId === -1 || !canUseFreehandWasm(options)) return null
	try {
		const wasm = tryGetFreehandWasm()
		if (!wasm) return null
		const n = rawInputPoints.length
		if (n === 0) return { path: '', pointCount: 0 }
		writePoints(wasm, rawInputPoints)
		const {
			size = 16,
			thinning = 0.5,
			smoothing = 0.5,
			streamline = 0.5,
			simulatePressure = false,
			last = false,
		} = options
		const len = wasm.svg_from_points(
			n,
			size,
			thinning,
			smoothing,
			streamline,
			simulatePressure ? 1 : 0,
			easingId,
			last ? 1 : 0,
			closed ? 1 : 0
		)
		const pointCount = wasm.last_point_count()
		return { path: readOutput(wasm, len), pointCount }
	} catch {
		instantiateFailed = true
		return null
	}
}

/**
 * WASM port of `getSvgPathFromPoints`: quadratic-midpoint path through an array of points.
 * Byte-for-byte identical to the JS implementation. Returns `null` only if the module can't
 * run.
 *
 * @internal
 */
export function getSvgPathFromPointsWasm(points: VecLike[], closed = true): string | null {
	try {
		const wasm = tryGetFreehandWasm()
		if (!wasm) return null
		const n = points.length
		if (n < 2) return ''
		writePoints(wasm, points)
		const len = wasm.get_svg_path_from_points(n, closed ? 1 : 0)
		return readOutput(wasm, len)
	} catch {
		instantiateFailed = true
		return null
	}
}

/**
 * The shape of a perfect-freehand StrokePoint, declared structurally (no package dep).
 *
 * @internal
 */
export interface StrokePointLike {
	point: VecLike
	input: VecLike
	pressure: number
	distance: number
	runningLength: number
	radius: number
}

/**
 * WASM port of getStrokePoints. Returns the streamlined points as a flat Float64Array, 8
 * values per point [pointX, pointY, inputX, inputY, inputZ, pressure, distance,
 * runningLength] (radius is always 1), or null if the module can't run.
 *
 * @internal
 */
export function strokePointsWasm(
	rawInputPoints: VecLike[],
	options: FreehandStrokeOptions = {}
): Float64Array | null {
	try {
		const wasm = tryGetFreehandWasm()
		if (!wasm) return null
		const n = rawInputPoints.length
		if (n === 0) return new Float64Array(0)
		writePoints(wasm, rawInputPoints)
		const { size = 16, thinning = 0.5, smoothing = 0.5, streamline = 0.5 } = options
		// getStrokePoints does ingest only (no radii), so easing is irrelevant here.
		const count = wasm.stroke_points(
			n,
			size,
			thinning,
			smoothing,
			streamline,
			options.simulatePressure ? 1 : 0,
			EASING_LINEAR,
			options.last ? 1 : 0
		)
		return readF64Output(wasm, count * 8)
	} catch {
		instantiateFailed = true
		return null
	}
}

/**
 * WASM port of getStroke. Returns the outline polygon as a flat Float64Array (x, y per
 * point), or null if the module can't run. Handles taper and custom easings.
 *
 * @internal
 */
export function strokeOutlineWasm(
	rawInputPoints: VecLike[],
	options: FreehandStrokeOptions = {}
): Float64Array | null {
	try {
		const wasm = tryGetFreehandWasm()
		if (!wasm) return null
		const n = rawInputPoints.length
		if (n === 0) return new Float64Array(0)
		const {
			size = 16,
			thinning = 0.5,
			smoothing = 0.5,
			streamline = 0.5,
			start = {},
			end = {},
		} = options
		// Resolve easings (may write LUTs) before writing points.
		const mainId = resolveEasingSlot(wasm, options.easing, 0, EASING_LUT_MAIN, EASING_LINEAR)
		const tStartId = resolveEasingSlot(
			wasm,
			start.easing,
			1,
			EASING_LUT_TAPER_START,
			EASING_OUT_QUAD
		)
		const tEndId = resolveEasingSlot(wasm, end.easing, 2, EASING_LUT_TAPER_END, EASING_OUT_CUBIC)
		writePoints(wasm, rawInputPoints)
		const count = wasm.get_stroke(
			n,
			size,
			thinning,
			smoothing,
			streamline,
			options.simulatePressure ? 1 : 0,
			mainId,
			options.last ? 1 : 0,
			taperValue(start.taper),
			taperValue(end.taper),
			tStartId,
			tEndId,
			start.cap === false ? 0 : 1,
			end.cap === false ? 0 : 1
		)
		return readF64Output(wasm, count * 2)
	} catch {
		instantiateFailed = true
		return null
	}
}

/**
 * WASM port of getStrokeOutlinePoints (outline from already-computed StrokePoints). Returns
 * the outline polygon as a flat Float64Array (x, y per point), or null.
 *
 * @internal
 */
export function strokeOutlineFromPointsWasm(
	strokePoints: StrokePointLike[],
	options: FreehandStrokeOptions = {}
): Float64Array | null {
	try {
		const wasm = tryGetFreehandWasm()
		if (!wasm) return null
		const n = strokePoints.length
		if (n === 0) return new Float64Array(0)
		const { size = 16, smoothing = 0.5, start = {}, end = {} } = options
		const tStartId = resolveEasingSlot(
			wasm,
			start.easing,
			1,
			EASING_LUT_TAPER_START,
			EASING_OUT_QUAD
		)
		const tEndId = resolveEasingSlot(wasm, end.easing, 2, EASING_LUT_TAPER_END, EASING_OUT_CUBIC)
		// 6 floats per point: pointX, pointY, inputX, inputY, radius, runningLength.
		const ptr = wasm.points_ptr(n * 6)
		const buf = new Float64Array(wasm.memory.buffer, ptr, n * 6)
		for (let i = 0; i < n; i++) {
			const sp = strokePoints[i]
			buf[i * 6] = sp.point.x
			buf[i * 6 + 1] = sp.point.y
			buf[i * 6 + 2] = sp.input.x
			buf[i * 6 + 3] = sp.input.y
			buf[i * 6 + 4] = sp.radius
			buf[i * 6 + 5] = sp.runningLength
		}
		const count = wasm.stroke_outline_from_points(
			n,
			size,
			smoothing,
			options.last ? 1 : 0,
			taperValue(start.taper),
			taperValue(end.taper),
			tStartId,
			tEndId,
			start.cap === false ? 0 : 1,
			end.cap === false ? 0 : 1
		)
		return readF64Output(wasm, count * 2)
	} catch {
		instantiateFailed = true
		return null
	}
}

/**
 * WASM port of getSvgPathFromStrokePoints. Takes the points' centerline coordinates (the
 * `.point` of each StrokePoint) and returns the path string, or null.
 *
 * @internal
 */
export function svgPathFromStrokePointsWasm(points: VecLike[], closed = false): string | null {
	try {
		const wasm = tryGetFreehandWasm()
		if (!wasm) return null
		const n = points.length
		if (n < 2) return ''
		const ptr = wasm.points_ptr(n * 2)
		const buf = new Float64Array(wasm.memory.buffer, ptr, n * 2)
		for (let i = 0; i < n; i++) {
			buf[i * 2] = points[i].x
			buf[i * 2 + 1] = points[i].y
		}
		const len = wasm.svg_path_from_stroke_points(n, closed ? 1 : 0)
		return readOutput(wasm, len)
	} catch {
		instantiateFailed = true
		return null
	}
}
