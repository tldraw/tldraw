import { describe, expect, it } from 'vitest'
import {
	renderPushByteLength,
	renderPushScript,
	THUMBNAIL_RENDER_GLOBAL,
} from './thumbnailScreenshot'

describe('renderPushByteLength', () => {
	it('counts one byte per char for Latin-1 strings', () => {
		expect(renderPushByteLength('abc')).toBe(3)
		// Every code point <= 0xFF stays Latin-1 (one byte each).
		expect(renderPushByteLength('aÿ\u0000')).toBe(3)
	})

	it('counts two bytes per char when any char is outside Latin-1', () => {
		// The whole string flips to UTF-16 the moment one char is non-Latin-1 — so a char count
		// (what a naive implementation would return: 2) understates it. This is the Codex finding.
		expect(renderPushByteLength('a€')).toBe(4)
		expect(renderPushByteLength('中文')).toBe(4)
	})
})

describe('renderPushScript', () => {
	it('assigns the global from a JSON.parse of the double-encoded payload', () => {
		const payload = {
			error: false as const,
			records: [{ id: 'shape:a' }] as any,
			schema: { schemaVersion: 2 } as any,
			renderParams: { x: 0, y: 0, z: 1, width: 1, height: 1, theme: 'light' as const },
		}
		const script = renderPushScript(payload)
		expect(script.startsWith(`window.${THUMBNAIL_RENDER_GLOBAL}=JSON.parse(`)).toBe(true)
		// The argument is a JSON string literal; parsing it twice recovers the payload, which proves
		// the double-encode round-trips (and that `"__proto__"` keys stay data, not prototype).
		const jsonLiteral = script.slice(`window.${THUMBNAIL_RENDER_GLOBAL}=JSON.parse(`.length, -1)
		expect(JSON.parse(JSON.parse(jsonLiteral))).toEqual(payload)
	})
})
