import { describe, expect, it } from 'vitest'
import { getVisibleViewport, isSoftKeyboardOpen, SOFT_KEYBOARD_MIN_INSET } from './visual-viewport'

function makeWindow(
	innerWidth: number,
	innerHeight: number,
	vv?: { offsetTop: number; offsetLeft: number; width: number; height: number }
): Window {
	return { innerWidth, innerHeight, visualViewport: vv ?? null } as unknown as Window
}

describe('getVisibleViewport', () => {
	it('reads the visual viewport, carrying its offset into the derived edges', () => {
		const win = makeWindow(1024, 768, { offsetTop: 40, offsetLeft: 10, width: 900, height: 500 })
		expect(getVisibleViewport(win)).toEqual({
			top: 40,
			left: 10,
			width: 900,
			height: 500,
			bottom: 540,
			right: 910,
		})
	})

	it('falls back to the layout viewport when visualViewport is absent', () => {
		const win = makeWindow(1024, 768)
		expect(getVisibleViewport(win)).toEqual({
			top: 0,
			left: 0,
			width: 1024,
			height: 768,
			bottom: 768,
			right: 1024,
		})
	})
})

describe('isSoftKeyboardOpen', () => {
	it('is true when the visible viewport is shorter than the layout viewport past the threshold', () => {
		const win = makeWindow(390, 800, { offsetTop: 0, offsetLeft: 0, width: 390, height: 500 })
		expect(isSoftKeyboardOpen(win)).toBe(true)
	})

	it('is false when nothing is covering the viewport', () => {
		const win = makeWindow(390, 800, { offsetTop: 0, offsetLeft: 0, width: 390, height: 800 })
		expect(isSoftKeyboardOpen(win)).toBe(false)
	})

	it('needs the inset to exceed the threshold, not just meet it', () => {
		const atThreshold = makeWindow(390, 800, {
			offsetTop: 0,
			offsetLeft: 0,
			width: 390,
			height: 800 - SOFT_KEYBOARD_MIN_INSET,
		})
		const pastThreshold = makeWindow(390, 800, {
			offsetTop: 0,
			offsetLeft: 0,
			width: 390,
			height: 800 - SOFT_KEYBOARD_MIN_INSET - 1,
		})
		expect(isSoftKeyboardOpen(atThreshold)).toBe(false)
		expect(isSoftKeyboardOpen(pastThreshold)).toBe(true)
	})

	it('treats a missing visualViewport as keyboard-down', () => {
		expect(isSoftKeyboardOpen(makeWindow(390, 800))).toBe(false)
	})
})
