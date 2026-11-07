import { afterEach, describe, expect, it, vi } from 'vitest'
import { arrayBufferToBase64, base64ToArrayBuffer } from './base64'

describe('arrayBufferToBase64', () => {
	const proto = Uint8Array.prototype as { toBase64?(): string }
	const original = proto.toBase64

	afterEach(() => {
		if (original) proto.toBase64 = original
		else delete proto.toBase64
	})

	it('round-trips through the chunked fallback', () => {
		delete proto.toBase64
		const bytes = new Uint8Array(0x8000 * 3 + 7).map((_, i) => i % 251)
		const base64 = arrayBufferToBase64(bytes.buffer)
		expect(new Uint8Array(base64ToArrayBuffer(base64))).toEqual(bytes)
	})

	it('prefers the native encoder when the runtime has one', () => {
		const native = vi.fn(function (this: Uint8Array) {
			return `native:${this.length}`
		})
		proto.toBase64 = native
		expect(arrayBufferToBase64(new Uint8Array([1, 2, 3]).buffer)).toBe('native:3')
		expect(native).toHaveBeenCalledOnce()
	})
})
