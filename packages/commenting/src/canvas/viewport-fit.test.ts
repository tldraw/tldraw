import { describe, expect, it } from 'vitest'
import { fitInViewport } from './viewport-fit'

/**
 * A 300×400 surface in a 360×640 container flush with the top of the window — a phone, roughly.
 * `shiftX`/`shiftY` are zero: the popover surfaces have no CSS transform, so their painted box is
 * the box they're positioned at. The composer's case is covered separately below.
 */
const PHONE = {
	width: 300,
	height: 400,
	shiftX: 0,
	shiftY: 0,
	containerTop: 0,
	containerWidth: 360,
}

/** No keyboard: the visual viewport's bottom edge is the full window height. */
const NO_KEYBOARD = 640

/** A keyboard covering the lower 300px of that 640px window. */
const KEYBOARD_UP = 340

describe('fitInViewport', () => {
	it('leaves a surface that already fits exactly where it was asked for', () => {
		expect(fitInViewport(PHONE, NO_KEYBOARD, 30, 100)).toMatchObject({ left: 30, top: 100 })
	})

	it('slides a surface up off the bottom edge rather than letting it hang past it', () => {
		// Asked for 400, which would end at 800 — 160px past the window.
		expect(fitInViewport(PHONE, NO_KEYBOARD, 30, 400).top).toBe(640 - 8 - 400)
	})

	it('slides a surface in off the right edge', () => {
		// Asked for 200, which would end at 500 in a 360-wide container.
		expect(fitInViewport(PHONE, NO_KEYBOARD, 200, 100).left).toBe(360 - 300 - 8)
	})

	it('keeps a surface off the near edges too', () => {
		expect(fitInViewport(PHONE, NO_KEYBOARD, -50, -50)).toMatchObject({ left: 8, top: 8 })
	})

	it('rides above the software keyboard', () => {
		// The same anchor that needed no adjustment with the keyboard down now has to move: only
		// 340px of window is visible, and the surface is 400 tall, so it caps and pins to the top.
		const fit = fitInViewport(PHONE, KEYBOARD_UP, 30, 100)
		expect(fit.maxHeight).toBe(340 - 8 - 8)
		expect(fit.top).toBe(8)
		expect(fit.top + fit.maxHeight).toBeLessThanOrEqual(KEYBOARD_UP)
	})

	it('caps to the visible height, not the window height, so a long thread scrolls', () => {
		expect(fitInViewport(PHONE, NO_KEYBOARD, 30, 100).maxHeight).toBe(640 - 8 - 8)
		expect(fitInViewport(PHONE, KEYBOARD_UP, 30, 100).maxHeight).toBe(340 - 8 - 8)
	})

	it('places a capped surface by the height it will have, not the height it wants', () => {
		// 400 tall but capped to 200 by a 216px-tall visible strip: it should sit at the top of
		// that strip, not be pushed up as though it were still 400 tall.
		const fit = fitInViewport(PHONE, 216, 30, 100)
		expect(fit.maxHeight).toBe(200)
		expect(fit.top).toBe(8)
	})

	it('never caps below a usable minimum, however little room is left', () => {
		expect(fitInViewport(PHONE, 0, 30, 100).maxHeight).toBe(120)
	})

	it('lets a surface too wide for its container overflow the far edge, not the near one', () => {
		// The leading edge stays reachable — a panel clamped off the left is unusable.
		const wide = { ...PHONE, width: 500 }
		expect(fitInViewport(wide, NO_KEYBOARD, 30, 100).left).toBe(8)
	})

	// The placement composer hangs its draft pin on the click point with a CSS transform, so it
	// paints 4px left of and 32px above the spot it is positioned at. It's the painted box that has
	// to stay on screen, and `left`/`top` still have to come back in positioned-box terms.
	const COMPOSER = { ...PHONE, height: 42, shiftX: -4, shiftY: -32 }

	it('corrects for a painted box the CSS transform moved off the positioned one', () => {
		const fit = fitInViewport(COMPOSER, KEYBOARD_UP, 200, 400)
		// The painted box lands exactly on the margin, on both axes.
		expect(fit.top + COMPOSER.shiftY + COMPOSER.height).toBe(KEYBOARD_UP - 8)
		expect(fit.left + COMPOSER.shiftX + COMPOSER.width).toBe(360 - 8)
	})

	it('leaves a transformed surface alone where its painted box already fits', () => {
		expect(fitInViewport(COMPOSER, KEYBOARD_UP, 30, 200)).toMatchObject({ left: 30, top: 200 })
	})
})
