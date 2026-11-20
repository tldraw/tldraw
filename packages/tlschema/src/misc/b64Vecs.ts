import { VecModel } from './geometry-types'

const _POINT_B64_LENGTH = 8

const FIRST_POINT_B64_LENGTH = 16

const FIRST_POINT_2D_B64_LENGTH = 12

const DEFAULT_PRESSURE = 0.5

const FLOAT16_MAX = 65504

function clampDeltaToFloat16(d: number): number {
	return d > FLOAT16_MAX ? FLOAT16_MAX : d < -FLOAT16_MAX ? -FLOAT16_MAX : d
}

/** @public */
export const DIM_2D = 2
/** @public */
export const DIM_3D = 3

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const B64_LOOKUP = new Uint8Array(128)
for (let i = 0; i < 64; i++) {
	B64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i
}

const SIX_BIT_MASK = 0x3f
const PADDING_CHAR_CODE = '='.charCodeAt(0)

const POW2 = new Float64Array(31)
for (let i = 0; i < 31; i++) {
	POW2[i] = Math.pow(2, i - 15)
}
const POW2_SUBNORMAL = Math.pow(2, -14) / 1024

const MANTISSA = new Float64Array(1024)
for (let i = 0; i < 1024; i++) {
	MANTISSA[i] = 1 + i / 1024
}

function nativeGetFloat16(dataView: DataView, offset: number): number {
	return (dataView as any).getFloat16(offset, true)
}
function fallbackGetFloat16(dataView: DataView, offset: number): number {
	return float16BitsToNumber(dataView.getUint16(offset, true))
}

const getFloat16 =
	typeof (DataView.prototype as any).getFloat16 === 'function'
		? nativeGetFloat16
		: fallbackGetFloat16

function nativeSetFloat16(dataView: DataView, offset: number, value: number): void {
	;(dataView as any).setFloat16(offset, value, true)
}
function fallbackSetFloat16(dataView: DataView, offset: number, value: number): void {
	dataView.setUint16(offset, numberToFloat16Bits(value), true)
}

const setFloat16 =
	typeof (DataView.prototype as any).setFloat16 === 'function'
		? nativeSetFloat16
		: fallbackSetFloat16

function nativeBase64ToUint8Array(base64: string): Uint8Array {
	return Uint8Array.fromBase64(base64)
}

/** @internal */
export function fallbackBase64ToUint8Array(base64: string): Uint8Array {
	const paddedLength = base64.length
	let padding = 0
	if (paddedLength > 0 && base64.charCodeAt(paddedLength - 1) === PADDING_CHAR_CODE) {
		padding++
		if (paddedLength > 1 && base64.charCodeAt(paddedLength - 2) === PADDING_CHAR_CODE) {
			padding++
		}
	}
	const numBytes = Math.floor((paddedLength * 3) / 4) - padding
	const bytes = new Uint8Array(numBytes)
	let byteIndex = 0

	const fullGroups = Math.floor((paddedLength - padding) / 4) * 4
	for (let i = 0; i < fullGroups; i += 4) {
		const c0 = B64_LOOKUP[base64.charCodeAt(i)]
		const c1 = B64_LOOKUP[base64.charCodeAt(i + 1)]
		const c2 = B64_LOOKUP[base64.charCodeAt(i + 2)]
		const c3 = B64_LOOKUP[base64.charCodeAt(i + 3)]

		const bitmap = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3

		bytes[byteIndex++] = (bitmap >> 16) & 255
		bytes[byteIndex++] = (bitmap >> 8) & 255
		bytes[byteIndex++] = bitmap & 255
	}

	if (padding === 1) {
		const c0 = B64_LOOKUP[base64.charCodeAt(fullGroups)]
		const c1 = B64_LOOKUP[base64.charCodeAt(fullGroups + 1)]
		const c2 = B64_LOOKUP[base64.charCodeAt(fullGroups + 2)]
		const bitmap = (c0 << 18) | (c1 << 12) | (c2 << 6)
		bytes[byteIndex++] = (bitmap >> 16) & 255
		bytes[byteIndex++] = (bitmap >> 8) & 255
	} else if (padding === 2) {
		const c0 = B64_LOOKUP[base64.charCodeAt(fullGroups)]
		const c1 = B64_LOOKUP[base64.charCodeAt(fullGroups + 1)]
		const bitmap = (c0 << 18) | (c1 << 12)
		bytes[byteIndex++] = (bitmap >> 16) & 255
	}

	return bytes
}

function nativeUint8ArrayToBase64(uint8Array: Uint8Array): string {
	return uint8Array.toBase64()
}

/** @internal */
export function fallbackUint8ArrayToBase64(uint8Array: Uint8Array): string {
	const len = uint8Array.length
	const fullGroups = Math.floor(len / 3) * 3
	let result = ''

	for (let i = 0; i < fullGroups; i += 3) {
		const byte1 = uint8Array[i]
		const byte2 = uint8Array[i + 1]
		const byte3 = uint8Array[i + 2]

		const bitmap = (byte1 << 16) | (byte2 << 8) | byte3
		result +=
			BASE64_CHARS[(bitmap >> 18) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 12) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 6) & SIX_BIT_MASK] +
			BASE64_CHARS[bitmap & SIX_BIT_MASK]
	}

	const remaining = len - fullGroups
	if (remaining === 1) {
		const bitmap = uint8Array[fullGroups] << 16
		result +=
			BASE64_CHARS[(bitmap >> 18) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 12) & SIX_BIT_MASK] +
			'=='
	} else if (remaining === 2) {
		const bitmap = (uint8Array[fullGroups] << 16) | (uint8Array[fullGroups + 1] << 8)
		result +=
			BASE64_CHARS[(bitmap >> 18) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 12) & SIX_BIT_MASK] +
			BASE64_CHARS[(bitmap >> 6) & SIX_BIT_MASK] +
			'='
	}

	return result
}

/** @internal */
const uint8ArrayToBase64 =
	typeof Uint8Array.prototype.toBase64 === 'function'
		? nativeUint8ArrayToBase64
		: fallbackUint8ArrayToBase64

/** @internal */
const base64ToUint8Array =
	typeof Uint8Array.fromBase64 === 'function'
		? nativeBase64ToUint8Array
		: fallbackBase64ToUint8Array

/** @internal */
export function float16BitsToNumber(bits: number): number {
	const sign = bits >> 15
	const exp = (bits >> 10) & 0x1f
	const frac = bits & 0x3ff

	if (exp === 0) {
		return sign ? -frac * POW2_SUBNORMAL : frac * POW2_SUBNORMAL
	}
	if (exp === 31) {
		return frac ? NaN : sign ? -Infinity : Infinity
	}
	const magnitude = POW2[exp] * MANTISSA[frac]
	return sign ? -magnitude : magnitude
}

/** @internal */
export function numberToFloat16Bits(value: number): number {
	if (value === 0) return Object.is(value, -0) ? 0x8000 : 0
	if (!Number.isFinite(value)) {
		if (Number.isNaN(value)) return 0x7e00
		return value > 0 ? 0x7c00 : 0xfc00
	}

	const sign = value < 0 ? 1 : 0
	value = Math.abs(value)

	const exp = Math.floor(Math.log2(value))
	let expBiased = exp + 15

	if (expBiased >= 31) {
		return (sign << 15) | 0x7c00
	}
	if (expBiased <= 0) {
		const frac = Math.round(value * Math.pow(2, 14) * 1024)
		return (sign << 15) | (frac & 0x3ff)
	}

	const mantissa = value / Math.pow(2, exp) - 1
	let frac = Math.round(mantissa * 1024)

	if (frac >= 1024) {
		frac = 0
		expBiased++
		if (expBiased >= 31) {
			return (sign << 15) | 0x7c00
		}
	}

	return (sign << 15) | (expBiased << 10) | frac
}

/** @public */
export class b64Vecs {
	/** @internal */
	static _legacyEncodePoint(x: number, y: number, z: number): string {
		const buffer = new Uint8Array(6)
		const dataView = new DataView(buffer.buffer)

		setFloat16(dataView, 0, x)
		setFloat16(dataView, 2, y)
		setFloat16(dataView, 4, z)

		return uint8ArrayToBase64(buffer)
	}

	/** @internal */
	static _legacyEncodePoints(points: VecModel[]): string {
		if (points.length === 0) return ''

		const buffer = new Uint8Array(points.length * 6)
		const dataView = new DataView(buffer.buffer)

		for (let i = 0; i < points.length; i++) {
			const p = points[i]
			const offset = i * 6
			setFloat16(dataView, offset, p.x)
			setFloat16(dataView, offset + 2, p.y)
			setFloat16(dataView, offset + 4, p.z ?? 0.5)
		}

		return uint8ArrayToBase64(buffer)
	}

	/** @internal */
	static _legacyDecodePoints(base64: string): VecModel[] {
		const bytes = base64ToUint8Array(base64)
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		const result: VecModel[] = []
		for (let offset = 0; offset < bytes.length; offset += 6) {
			result.push({
				x: getFloat16(dataView, offset),
				y: getFloat16(dataView, offset + 2),
				z: getFloat16(dataView, offset + 4),
			})
		}
		return result
	}

	/** @public */
	static encodePoints(points: VecModel[], dim?: 2 | 3): string {
		if (dim === DIM_2D) return b64Vecs.encodePoints2D(points)
		if (points.length === 0) return ''

		const firstPointBytes = 12
		const deltaBytes = (points.length - 1) * 6
		const totalBytes = firstPointBytes + deltaBytes

		const buffer = new Uint8Array(totalBytes)
		const dataView = new DataView(buffer.buffer)

		const first = points[0]
		dataView.setFloat32(0, first.x, true)
		dataView.setFloat32(4, first.y, true)
		dataView.setFloat32(8, first.z ?? 0.5, true)

		let prevX = first.x
		let prevY = first.y
		let prevZ = first.z ?? 0.5

		for (let i = 1; i < points.length; i++) {
			const p = points[i]
			const z = p.z ?? 0.5

			const rawDx = p.x - prevX
			const rawDy = p.y - prevY
			const dx = clampDeltaToFloat16(rawDx)
			const dy = clampDeltaToFloat16(rawDy)

			const offset = firstPointBytes + (i - 1) * 6
			setFloat16(dataView, offset, dx)
			setFloat16(dataView, offset + 2, dy)
			setFloat16(dataView, offset + 4, z - prevZ)

			prevX = dx === rawDx ? p.x : prevX + dx
			prevY = dy === rawDy ? p.y : prevY + dy
			prevZ = z
		}

		return uint8ArrayToBase64(buffer)
	}

	/** @public */
	static decodePoints(base64: string, dim?: 2 | 3): VecModel[] {
		if (dim === DIM_2D) return b64Vecs.decodePoints2D(base64)
		if (base64.length === 0) return []

		const bytes = base64ToUint8Array(base64)
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		const result: VecModel[] = []

		let x = dataView.getFloat32(0, true)
		let y = dataView.getFloat32(4, true)
		let z = dataView.getFloat32(8, true)
		result.push({ x, y, z })

		const firstPointBytes = 12
		for (let offset = firstPointBytes; offset < bytes.length; offset += 6) {
			x += getFloat16(dataView, offset)
			y += getFloat16(dataView, offset + 2)
			z += getFloat16(dataView, offset + 4)
			result.push({ x, y, z })
		}

		return result
	}

	/** @public */
	static decodeFirstPoint(b64Points: string, dim?: 2 | 3): VecModel | null {
		if (dim === DIM_2D) return b64Vecs.decodeFirstPoint2D(b64Points)
		if (b64Points.length < FIRST_POINT_B64_LENGTH) return null

		const bytes = base64ToUint8Array(b64Points.slice(0, FIRST_POINT_B64_LENGTH))
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

		return {
			x: dataView.getFloat32(0, true),
			y: dataView.getFloat32(4, true),
			z: dataView.getFloat32(8, true),
		}
	}

	/** @public */
	static decodeLastPoint(b64Points: string, dim?: 2 | 3): VecModel | null {
		if (dim === DIM_2D) return b64Vecs.decodeLastPoint2D(b64Points)
		if (b64Points.length < FIRST_POINT_B64_LENGTH) return null

		const bytes = base64ToUint8Array(b64Points)
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

		let x = dataView.getFloat32(0, true)
		let y = dataView.getFloat32(4, true)
		let z = dataView.getFloat32(8, true)

		const firstPointBytes = 12
		for (let offset = firstPointBytes; offset < bytes.length; offset += 6) {
			x += getFloat16(dataView, offset)
			y += getFloat16(dataView, offset + 2)
			z += getFloat16(dataView, offset + 4)
		}

		return { x, y, z }
	}

	/** @public */
	static encodePoints2D(points: VecModel[]): string {
		if (points.length === 0) return ''

		const firstPointBytes = 8
		const deltaBytes = (points.length - 1) * 4
		const buffer = new Uint8Array(firstPointBytes + deltaBytes)
		const dataView = new DataView(buffer.buffer)

		const first = points[0]
		dataView.setFloat32(0, first.x, true)
		dataView.setFloat32(4, first.y, true)

		let prevX = first.x
		let prevY = first.y

		for (let i = 1; i < points.length; i++) {
			const p = points[i]
			const rawDx = p.x - prevX
			const rawDy = p.y - prevY
			const dx = clampDeltaToFloat16(rawDx)
			const dy = clampDeltaToFloat16(rawDy)
			const offset = firstPointBytes + (i - 1) * 4
			setFloat16(dataView, offset, dx)
			setFloat16(dataView, offset + 2, dy)
			prevX = dx === rawDx ? p.x : prevX + dx
			prevY = dy === rawDy ? p.y : prevY + dy
		}

		return uint8ArrayToBase64(buffer)
	}

	/** @public */
	static decodePoints2D(base64: string): VecModel[] {
		if (base64.length === 0) return []

		const bytes = base64ToUint8Array(base64)
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
		const result: VecModel[] = []

		let x = dataView.getFloat32(0, true)
		let y = dataView.getFloat32(4, true)
		result.push({ x, y, z: DEFAULT_PRESSURE })

		const firstPointBytes = 8
		for (let offset = firstPointBytes; offset < bytes.length; offset += 4) {
			x += getFloat16(dataView, offset)
			y += getFloat16(dataView, offset + 2)
			result.push({ x, y, z: DEFAULT_PRESSURE })
		}

		return result
	}

	/** @public */
	static decodeFirstPoint2D(b64Points: string): VecModel | null {
		if (b64Points.length < FIRST_POINT_2D_B64_LENGTH) return null

		const bytes = base64ToUint8Array(b64Points.slice(0, FIRST_POINT_2D_B64_LENGTH))
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

		return {
			x: dataView.getFloat32(0, true),
			y: dataView.getFloat32(4, true),
			z: DEFAULT_PRESSURE,
		}
	}

	/** @public */
	static decodeLastPoint2D(b64Points: string): VecModel | null {
		if (b64Points.length < FIRST_POINT_2D_B64_LENGTH) return null

		const bytes = base64ToUint8Array(b64Points)
		const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

		let x = dataView.getFloat32(0, true)
		let y = dataView.getFloat32(4, true)

		const firstPointBytes = 8
		for (let offset = firstPointBytes; offset < bytes.length; offset += 4) {
			x += getFloat16(dataView, offset)
			y += getFloat16(dataView, offset + 2)
		}

		return { x, y, z: DEFAULT_PRESSURE }
	}

	/** @public */
	static isSinglePoint(b64Points: string, dim?: 2 | 3): boolean {
		return b64Points.length <= (dim === DIM_2D ? FIRST_POINT_2D_B64_LENGTH : FIRST_POINT_B64_LENGTH)
	}
}
