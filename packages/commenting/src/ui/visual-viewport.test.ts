import { describe, expect, it } from 'vitest'
import { getVisibleViewport } from './visual-viewport'

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
