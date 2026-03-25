import {
	init as initZstd,
	compress as zstdCompress,
	decompress as zstdDecompress,
	compressUsingDict,
	decompressUsingDict,
	createCCtx,
	createDCtx,
} from '@bokuweb/zstd-wasm'
import {
	Module as zstdModule,
	waitInitialized as waitZstdInitialized,
} from '../../../../node_modules/@bokuweb/zstd-wasm/dist/web/module.js'
import { TLDRAW_SYNC_DICTIONARY } from './zstd-dictionary'

const ZSTD_COMPRESSION_LEVEL = 3
const ZSTD_WASM_CDN_URL = 'https://unpkg.com/@bokuweb/zstd-wasm@0.0.27/dist/web/zstd.wasm'
const MIN_COMPRESSION_BYTES = 33

/**
 * Single byte prefix on compressed messages to indicate the compression method.
 * This allows the receiver to determine how to decompress the message, and
 * provides forward compatibility for changing compression strategies.
 */
const enum CompressionPrefix {
	/** Compressed with zstd using the tldraw sync dictionary */
	ZstdDict = 0x01,
	/** Compressed with plain zstd (no dictionary) */
	Zstd = 0x02,
}

let _initialized = false
let _initPromise: Promise<void> | null = null
let _cctx: number | null = null
let _dctx: number | null = null

declare global {
	var __tldrawZstdPrecompiledModule: WebAssembly.Module | undefined
	var __tldraw_socket_debug: boolean | undefined
}

function debugCompression(...args: any[]) {
	if (globalThis.__tldraw_socket_debug) {
		// eslint-disable-next-line no-console
		console.debug('[sync compression]', ...args)
	}
}

async function initZstdWithPrecompiledModule(module: WebAssembly.Module) {
	// Use a precompiled module to avoid runtime wasm code generation.
	debugCompression('initializing with precompiled wasm module')
	zstdModule.instantiateWasm = (
		imports: WebAssembly.Imports,
		receiveInstance: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void
	) => {
		const instance = new WebAssembly.Instance(module, imports)
		receiveInstance(instance, module)
		return instance.exports
	}

	zstdModule.init()
	await waitZstdInitialized()
	debugCompression('initialized with precompiled wasm module')
}

async function initZstdWithoutUrlResolution() {
	// Bypass @bokuweb/zstd-wasm's index.web init wrapper, which always
	// evaluates `new URL(..., import.meta.url)` and can throw in wrangler dev.
	debugCompression('initializing via explicit wasm url fallback')
	zstdModule.init(ZSTD_WASM_CDN_URL)
	await waitZstdInitialized()
	debugCompression('initialized via explicit wasm url fallback')
}

async function ensureInitialized(): Promise<void> {
	if (_initialized) return
	if (_initPromise) return _initPromise
	_initPromise = (async () => {
		debugCompression('ensureInitialized start')
		const precompiledModule = globalThis.__tldrawZstdPrecompiledModule
		if (precompiledModule) {
			await initZstdWithPrecompiledModule(precompiledModule)
		} else {
			try {
				debugCompression('initializing via package init()')
				await initZstd()
				debugCompression('initialized via package init()')
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				debugCompression('init() failed', message)
				// Wrangler dev can produce an invalid import.meta.url for zstd-wasm's
				// default URL resolution; fall back to an explicit wasm URL.
				if (!message.includes('Invalid URL')) throw error
				await initZstdWithoutUrlResolution()
			}
		}
		_cctx = createCCtx()
		_dctx = createDCtx()
		_initialized = true
		debugCompression('contexts created; compression ready')
	})()

	_initPromise.catch(() => {
		_initPromise = null
	})
	return _initPromise
}

/** @public */
export interface CompressionMetrics {
	originalSize: number
	compressedSize: number
	ratio: number
	method: 'zstd-dict' | 'zstd' | 'none'
}

/**
 * Compress a JSON string for WebSocket transport using zstd dictionary compression.
 *
 * The output format is: [1-byte prefix][compressed payload]
 * The prefix byte identifies the compression method for the receiver.
 *
 * Returns null if compression hasn't been initialized yet (caller should
 * fall back to sending uncompressed).
 *
 * @public
 */
export function compressMessage(json: string): Uint8Array | null {
	if (!_initialized || !_cctx) return null

	const encoder = new TextEncoder()
	const data = encoder.encode(json)
	if (data.length < MIN_COMPRESSION_BYTES) return null

	const compressed = compressUsingDict(_cctx, data, TLDRAW_SYNC_DICTIONARY, ZSTD_COMPRESSION_LEVEL)

	const result = new Uint8Array(1 + compressed.length)
	result[0] = CompressionPrefix.ZstdDict
	result.set(compressed, 1)
	return result
}

/**
 * Decompress a binary WebSocket message back to a JSON string.
 *
 * Reads the 1-byte prefix to determine the compression method,
 * then decompresses accordingly.
 *
 * Returns null if the message format is unrecognized.
 *
 * @public
 */
export function decompressMessage(data: Uint8Array): string | null {
	if (!_initialized || !_dctx || data.length < 2) return null

	const prefix = data[0]
	const payload = data.subarray(1)

	let decompressed: Uint8Array

	switch (prefix) {
		case CompressionPrefix.ZstdDict:
			decompressed = decompressUsingDict(_dctx, payload, TLDRAW_SYNC_DICTIONARY)
			break
		case CompressionPrefix.Zstd:
			decompressed = zstdDecompress(payload)
			break
		default:
			return null
	}

	const decoder = new TextDecoder()
	return decoder.decode(decompressed)
}

/**
 * Compress and return metrics about the compression. Useful for logging
 * and evaluating dictionary effectiveness.
 *
 * @public
 */
export function compressMessageWithMetrics(json: string): {
	compressed: Uint8Array | null
	metrics: CompressionMetrics
} {
	const encoder = new TextEncoder()
	const originalData = encoder.encode(json)
	const originalSize = originalData.length

	if (!_initialized || !_cctx || originalSize < MIN_COMPRESSION_BYTES) {
		return {
			compressed: null,
			metrics: { originalSize, compressedSize: originalSize, ratio: 1, method: 'none' },
		}
	}

	const compressed = compressUsingDict(
		_cctx,
		originalData,
		TLDRAW_SYNC_DICTIONARY,
		ZSTD_COMPRESSION_LEVEL
	)

	const compressedSize = 1 + compressed.length
	const result = new Uint8Array(compressedSize)
	result[0] = CompressionPrefix.ZstdDict
	result.set(compressed, 1)

	return {
		compressed: result,
		metrics: {
			originalSize,
			compressedSize,
			ratio: originalSize / compressedSize,
			method: 'zstd-dict',
		},
	}
}

/**
 * Compress without dictionary for comparison benchmarking.
 *
 * @public
 */
export function compressMessagePlain(json: string): {
	compressed: Uint8Array | null
	metrics: CompressionMetrics
} {
	const encoder = new TextEncoder()
	const originalData = encoder.encode(json)
	const originalSize = originalData.length

	if (!_initialized || originalSize < MIN_COMPRESSION_BYTES) {
		return {
			compressed: null,
			metrics: { originalSize, compressedSize: originalSize, ratio: 1, method: 'none' },
		}
	}

	const compressed = zstdCompress(originalData, ZSTD_COMPRESSION_LEVEL)

	const compressedSize = 1 + compressed.length
	const result = new Uint8Array(compressedSize)
	result[0] = CompressionPrefix.Zstd
	result.set(compressed, 1)

	return {
		compressed: result,
		metrics: {
			originalSize,
			compressedSize,
			ratio: originalSize / compressedSize,
			method: 'zstd',
		},
	}
}

/**
 * Initialize the compression subsystem. Must be called before any
 * compress/decompress operations. Safe to call multiple times.
 *
 * @public
 */
export async function initCompression(): Promise<void> {
	return ensureInitialized()
}

/**
 * Check if the compression subsystem is ready.
 *
 * @public
 */
export function isCompressionReady(): boolean {
	return _initialized
}

/**
 * Check if a binary message is a compressed tldraw sync message
 * by looking at the first byte prefix.
 *
 * @public
 */
export function isCompressedMessage(data: Uint8Array | ArrayBuffer): boolean {
	const view = data instanceof ArrayBuffer ? new Uint8Array(data) : data
	if (view.length < 2) return false
	return view[0] === CompressionPrefix.ZstdDict || view[0] === CompressionPrefix.Zstd
}
