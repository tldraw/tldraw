import { act } from '@testing-library/react'
import { Box, Editor, createShapeId } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// These tests drive the real DOM event handlers (useCanvasEvents for pointer
// events, useGestureEvents for touch pinch) rather than dispatching synthetic
// editor events, so they exercise the same path a touch device takes. jsdom is
// missing a few browser APIs those handlers rely on, so we polyfill them here.

if (typeof (globalThis as any).PointerEvent === 'undefined') {
	// jsdom has no PointerEvent; the canvas handlers do `e instanceof PointerEvent`.
	;(globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
		pointerId: number
		pointerType: string
		pressure: number
		isPrimary: boolean
		constructor(type: string, params: any = {}) {
			super(type, params)
			this.pointerId = params.pointerId ?? 0
			this.pointerType = params.pointerType ?? ''
			this.pressure = params.pressure ?? 0
			this.isPrimary = params.isPrimary ?? false
		}
	}
}
if (!Element.prototype.setPointerCapture) {
	Element.prototype.setPointerCapture = () => {}
	Element.prototype.releasePointerCapture = () => {}
	Element.prototype.hasPointerCapture = () => false
}

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
	c: createShapeId('c'),
}

function pointerDownEvent(clientX: number, clientY: number, pointerId = 1) {
	return new (globalThis as any).PointerEvent('pointerdown', {
		bubbles: true,
		cancelable: true,
		clientX,
		clientY,
		button: 0,
		pointerId,
		pointerType: 'touch',
		isPrimary: pointerId === 1,
	})
}

function pointerCancelEvent(clientX: number, clientY: number, pointerId = 1) {
	return new (globalThis as any).PointerEvent('pointercancel', {
		bubbles: true,
		cancelable: true,
		clientX,
		clientY,
		button: 0,
		pointerId,
		pointerType: 'touch',
		isPrimary: pointerId === 1,
	})
}

function touchEvent(type: string, points: Array<{ clientX: number; clientY: number }>) {
	const e = new Event(type, { bubbles: true, cancelable: true })
	const touches = points.map((p, i) => ({ clientX: p.clientX, clientY: p.clientY, identifier: i }))
	Object.defineProperties(e, {
		touches: { value: touches },
		targetTouches: { value: touches },
		changedTouches: { value: touches },
	})
	return e
}

async function setupScene() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)
	const canvas = document.querySelector('[data-testid="canvas"]') as HTMLElement
	await act(async () => {
		editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
		editor.createShapes([
			// centers: a (50,50), b (250,50), c (450,50)
			{ id: ids.a, type: 'geo', x: 0, y: 0, props: { fill: 'solid', w: 100, h: 100 } },
			{ id: ids.b, type: 'geo', x: 200, y: 0, props: { fill: 'solid', w: 100, h: 100 } },
			{ id: ids.c, type: 'geo', x: 400, y: 0, props: { fill: 'solid', w: 100, h: 100 } },
		])
	})
	return { editor, canvas }
}

// Two-finger pinch-zoom. The gesture handler defers pinch_end to a rAF, so we
// wait for it to fire and then flush the editor's pending event queue.
async function pinchZoom(editor: Editor, canvas: HTMLElement) {
	await act(async () => {
		canvas.dispatchEvent(
			touchEvent('touchstart', [
				{ clientX: 250, clientY: 50 },
				{ clientX: 350, clientY: 50 },
			])
		)
		editor.emit('tick', 16)
	})
	await act(async () => {
		canvas.dispatchEvent(
			touchEvent('touchmove', [
				{ clientX: 220, clientY: 50 },
				{ clientX: 380, clientY: 50 },
			])
		)
		editor.emit('tick', 16)
	})
	await act(async () => {
		canvas.dispatchEvent(touchEvent('touchend', []))
	})
	await act(async () => {
		await new Promise((r) => setTimeout(r, 32)) // let the deferred rAF dispatch pinch_end
		editor.emit('tick', 16) // flush pinch_end (immediate restore)
		editor.emit('tick', 16) // run the deferred once('tick') re-restore
	})
}

describe('pinch selection via real DOM events', () => {
	it('rolls back an incidental first-finger selection on a touch pinch', async () => {
		const { editor, canvas } = await setupScene()

		await act(async () => {
			editor.select(ids.a)
		})

		// First finger lands on shape b — through the real pointer handler this
		// changes the selection before the pinch starts.
		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(250, 50))
			editor.emit('tick', 16)
		})
		expect(editor.getSelectedShapeIds()).toEqual([ids.b])

		await pinchZoom(editor, canvas)

		expect(editor.getZoomLevel()).toBeGreaterThan(1) // the pinch really zoomed
		expect(editor.getSelectedShapeIds()).toEqual([ids.a]) // incidental change rolled back
	})

	it('restores correctly when a second pointer_down arrives before pinch_start', async () => {
		// Models the touch ordering where both fingers' pointer_down events are
		// processed before touchstart fires pinch_start. The pre-gesture selection
		// must still win.
		const { editor, canvas } = await setupScene()

		await act(async () => {
			editor.select(ids.a)
		})

		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(250, 50, 1)) // finger 1 on b
			editor.emit('tick', 16)
			canvas.dispatchEvent(pointerDownEvent(450, 50, 2)) // finger 2 on c
			editor.emit('tick', 16)
		})

		await pinchZoom(editor, canvas)

		expect(editor.getSelectedShapeIds()).toEqual([ids.a])
	})

	it('does not let a second finger change the selection (multi-touch gate)', async () => {
		const { editor, canvas } = await setupScene()

		await act(async () => {
			editor.select(ids.a)
		})

		// First finger lands on b and selects it through the real pointer handler.
		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(250, 50, 1))
			editor.emit('tick', 16)
		})
		expect(editor.getSelectedShapeIds()).toEqual([ids.b])

		// Second finger lands on c. Two touch pointers are now down, so this is a
		// multi-touch gesture: the second finger must not change the selection
		// (without the gate it would select c before pinch_start arrives).
		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(450, 50, 2))
			editor.emit('tick', 16)
		})
		expect(editor.getSelectedShapeIds()).toEqual([ids.b])

		// The pinch still rolls the selection back to what it was before the gesture.
		await pinchZoom(editor, canvas)
		expect(editor.getSelectedShapeIds()).toEqual([ids.a])
	})

	it('recovers from a cancelled pointer without leaving pointing state stuck', async () => {
		const { editor, canvas } = await setupScene()

		await act(async () => {
			editor.select(ids.a)
		})

		// A finger lands on b and starts a pointing interaction.
		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(250, 50, 1))
			editor.emit('tick', 16)
		})
		expect(editor.inputs.getIsPointing()).toBe(true)
		expect(editor.getSelectedShapeIds()).toEqual([ids.b])

		// The browser cancels the pointer (e.g. palm rejection). No pointer_up will
		// arrive, so the pointing state must be torn down here.
		await act(async () => {
			canvas.dispatchEvent(pointerCancelEvent(250, 50, 1))
			editor.emit('tick', 16)
		})
		expect(editor.inputs.getIsPointing()).toBe(false)

		// A later pointer interaction still works normally.
		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(450, 50, 3))
			editor.emit('tick', 16)
		})
		expect(editor.getSelectedShapeIds()).toEqual([ids.c])
	})

	it('moves through the gesture phases: idle → multi-touch → pinching → idle', async () => {
		const { editor, canvas } = await setupScene()
		expect(editor.inputs.getGesturePhase()).toBe('idle')

		// One finger down is not yet a multi-touch gesture.
		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(250, 50, 1))
			editor.emit('tick', 16)
		})
		expect(editor.inputs.getGesturePhase()).toBe('idle')

		// A second finger down enters the multi-touch phase.
		await act(async () => {
			canvas.dispatchEvent(pointerDownEvent(350, 50, 2))
			editor.emit('tick', 16)
		})
		expect(editor.inputs.getGesturePhase()).toBe('multi-touch')

		// The touch stream confirms the pinch.
		await act(async () => {
			canvas.dispatchEvent(
				touchEvent('touchstart', [
					{ clientX: 250, clientY: 50 },
					{ clientX: 350, clientY: 50 },
				])
			)
			editor.emit('tick', 16)
		})
		expect(editor.inputs.getGesturePhase()).toBe('pinching')

		// Lifting the fingers ends the gesture and returns to idle.
		await act(async () => {
			canvas.dispatchEvent(touchEvent('touchend', []))
			await new Promise((r) => setTimeout(r, 32))
			editor.emit('tick', 16)
			editor.emit('tick', 16)
		})
		expect(editor.inputs.getGesturePhase()).toBe('idle')
	})

	it('keeps the live selection for a pinch with no preceding pointer_down', async () => {
		// Models the Safari-style path: a click changes the selection, then a pinch
		// arrives with no fresh pointer_down. The clicked shape must stay selected.
		const { editor, canvas } = await setupScene()

		await act(async () => {
			editor.select(ids.a, ids.b)
			editor.setSelectedShapes([ids.c]) // "click" outcome, no live pointer_down
		})

		await pinchZoom(editor, canvas)

		expect(editor.getSelectedShapeIds()).toEqual([ids.c])
	})
})
