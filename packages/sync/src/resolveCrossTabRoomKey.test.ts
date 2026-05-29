import { describe, expect, it } from 'vitest'
import { deriveRoomKeyFromUri, resolveCrossTabRoomKey } from './useSync'

describe('deriveRoomKeyFromUri', () => {
	it('strips query and fragment so rotating tokens produce the same key', () => {
		const a = deriveRoomKeyFromUri('wss://sync.tldraw.com/r/room-123?token=abc&v=1')
		const b = deriveRoomKeyFromUri('wss://sync.tldraw.com/r/room-123?token=xyz&v=2')
		const c = deriveRoomKeyFromUri('wss://sync.tldraw.com/r/room-123#fragment')
		expect(a).toBe(b)
		expect(a).toBe(c)
		expect(a).toBe('wss://sync.tldraw.com/r/room-123')
	})

	it('distinguishes different rooms on the same host', () => {
		const a = deriveRoomKeyFromUri('wss://sync.tldraw.com/r/room-123')
		const b = deriveRoomKeyFromUri('wss://sync.tldraw.com/r/room-456')
		expect(a).not.toBe(b)
	})

	it('distinguishes different hosts even for the same path', () => {
		const a = deriveRoomKeyFromUri('wss://prod.tldraw.com/r/room-1')
		const b = deriveRoomKeyFromUri('wss://staging.tldraw.com/r/room-1')
		expect(a).not.toBe(b)
	})

	it('falls back to the raw string when URL parsing fails', () => {
		const a = deriveRoomKeyFromUri('not a url')
		expect(a).toBe('not a url')
	})
})

describe('resolveCrossTabRoomKey', () => {
	it('returns null when crossTab is explicitly false', () => {
		expect(resolveCrossTabRoomKey(false, 'wss://sync.tldraw.com/r/room-1')).toBeNull()
		expect(resolveCrossTabRoomKey(false, () => 'wss://sync.tldraw.com/r/room-1')).toBeNull()
		expect(resolveCrossTabRoomKey(false, undefined)).toBeNull()
	})

	it('uses the explicit roomKey verbatim when crossTab is an object', () => {
		expect(resolveCrossTabRoomKey({ roomKey: 'my-room' }, 'wss://sync/r/other')).toBe('my-room')
		expect(resolveCrossTabRoomKey({ roomKey: 'my-room' }, () => 'wss://sync/r/other')).toBe(
			'my-room'
		)
		// Works with no uri (custom transport path).
		expect(resolveCrossTabRoomKey({ roomKey: 'my-room' }, undefined)).toBe('my-room')
	})

	it('derives from a string uri when crossTab is undefined', () => {
		expect(resolveCrossTabRoomKey(undefined, 'wss://sync.tldraw.com/r/room-1?token=abc')).toBe(
			'wss://sync.tldraw.com/r/room-1'
		)
	})

	it('derives from a string uri when crossTab is true', () => {
		expect(resolveCrossTabRoomKey(true, 'wss://sync.tldraw.com/r/room-1?token=abc')).toBe(
			'wss://sync.tldraw.com/r/room-1'
		)
	})

	it('returns null when crossTab is undefined and uri is a function (no key to derive)', () => {
		expect(resolveCrossTabRoomKey(undefined, () => 'wss://sync.tldraw.com/r/room-1')).toBeNull()
	})

	it('throws when crossTab is true and uri is a function (no key to derive)', () => {
		expect(() =>
			resolveCrossTabRoomKey(true, () => 'wss://sync.tldraw.com/r/room-1')
		).toThrowError(/crossTab: true/)
	})

	it('throws when crossTab is true and no uri is given (custom transport without roomKey)', () => {
		expect(() => resolveCrossTabRoomKey(true, undefined)).toThrowError(/crossTab: true/)
	})
})
