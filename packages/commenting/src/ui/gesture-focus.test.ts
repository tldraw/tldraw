import { describe, expect, it, vi } from 'vitest'
import { focusOnGestureEnd } from './gesture-focus'

const pointer = (type: 'pointerdown' | 'pointerup') =>
	document.dispatchEvent(new Event(type, { bubbles: true }))

describe('focusOnGestureEnd', () => {
	it('focuses on the release that ends the gesture the field was mounted during', () => {
		const focus = vi.fn()
		focusOnGestureEnd(document, focus)
		pointer('pointerup')
		expect(focus).toHaveBeenCalledTimes(1)
	})

	it('only focuses once, so later gestures leave the caret alone', () => {
		const focus = vi.fn()
		focusOnGestureEnd(document, focus)
		pointer('pointerup')
		pointer('pointerdown')
		pointer('pointerup')
		expect(focus).toHaveBeenCalledTimes(1)
	})

	it('gives up when a press comes first — that release belongs to another gesture', () => {
		const focus = vi.fn()
		focusOnGestureEnd(document, focus)
		pointer('pointerdown')
		pointer('pointerup')
		expect(focus).not.toHaveBeenCalled()
	})

	it('stops listening once detached', () => {
		const focus = vi.fn()
		const stop = focusOnGestureEnd(document, focus)
		stop()
		pointer('pointerup')
		expect(focus).not.toHaveBeenCalled()
	})

	it('can be detached more than once', () => {
		const stop = focusOnGestureEnd(document, vi.fn())
		stop()
		expect(() => stop()).not.toThrow()
	})
})
