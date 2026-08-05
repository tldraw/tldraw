import { act } from '@testing-library/react'
import { Box, Vec, tlenv } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// These tests drive the real DOM handlers in useCanvasEvents rather than
// dispatching synthetic editor events: the stale-pan recovery lives in the
// document-level pointermove listener, which TestEditor/Driver bypass.

// jsdom implements PointerEvent but not pointer capture, which the canvas
// pointerdown handler calls.
if (!Element.prototype.setPointerCapture) {
	Element.prototype.setPointerCapture = () => {}
	Element.prototype.releasePointerCapture = () => {}
	Element.prototype.hasPointerCapture = () => false
}

function pointerEvent(
	type: 'pointerdown' | 'pointermove' | 'pointerup',
	options: {
		clientX: number
		clientY: number
		button?: number
		buttons: number
		ctrlKey?: boolean
	}
) {
	return new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		pointerId: 1,
		pointerType: 'mouse',
		isPrimary: true,
		button: 0,
		...options,
	})
}

async function setup() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)
	const canvas = document.querySelector('[data-testid="canvas"]') as HTMLElement
	await act(async () => {
		editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
	})
	return { editor, canvas }
}

// Dispatch a DOM event and flush the editor's pending event queue.
async function fire(editor: any, target: Element | HTMLElement, event: Event) {
	await act(async () => {
		target.dispatchEvent(event)
		editor.emit('tick', 16)
	})
}

describe('stale pan recovery via real DOM events', () => {
	it('ends a right-click pan when the pointerup was missed', async () => {
		const { editor, canvas } = await setup()

		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
		)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 2 })
		)
		expect(editor.inputs.getIsPanning()).toBe(true)
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })

		// The mouse re-enters the window with no buttons held: the pointerup
		// was eaten outside. The next move must end the pan, not continue it.
		editor.inputs.setPointerVelocity(new Vec(0, 0))
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsPanning()).toBe(false)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.getInstanceState().cursor.type).not.toBe('grabbing')
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })

		// Further movement must not pan either.
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 450, clientY: 450, buttons: 0 })
		)
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })
	})

	it('ends right-click pointing when the pointerup was missed before panning starts', async () => {
		const { editor, canvas } = await setup()

		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
		)
		expect(editor.inputs.getIsRightPointing()).toBe(true)
		expect(editor.inputs.getIsPanning()).toBe(false)

		// The pointer leaves before crossing the drag threshold and its pointerup is
		// lost. The first move back must end the pending right-click rather than turn
		// it into a pan based on the distance from the original pointerdown.
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsRightPointing()).toBe(false)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.inputs.getIsPanning()).toBe(false)
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })
	})

	it('preserves the selection when a missed right pointerup is recovered', async () => {
		const { editor, canvas } = await setup()

		await act(async () => {
			editor.createShape({ type: 'geo', x: 500, y: 500 })
			editor.select(editor.getCurrentPageShapes()[0].id)
		})
		const selectedIds = editor.getSelectedShapeIds()

		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
		)
		expect(editor.inputs.getIsRightPointing()).toBe(true)

		// The pointerup was missed outside the window. Recovery must not complete
		// a right_click at the re-entry point, which would clear the selection.
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsRightPointing()).toBe(false)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.getSelectedShapeIds()).toEqual(selectedIds)
	})

	it('recovers a stale right button on non-darwin even while the left button is held', async () => {
		const prevIsDarwin = tlenv.isDarwin
		tlenv.isDarwin = false
		try {
			const { editor, canvas } = await setup()

			await fire(
				editor,
				canvas,
				pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
			)
			await fire(
				editor,
				document.body,
				pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 2 })
			)
			expect(editor.inputs.getIsPanning()).toBe(true)

			// Right released outside the window while the left button is down. Off
			// darwin the left bit can't stand in for button 2, so the pan must end.
			editor.inputs.setPointerVelocity(new Vec(0, 0))
			await fire(
				editor,
				document.body,
				pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 1 })
			)
			expect(editor.inputs.getIsPanning()).toBe(false)
			expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })
		} finally {
			tlenv.isDarwin = prevIsDarwin
		}
	})

	it('keeps panning while the right button is still held', async () => {
		const { editor, canvas } = await setup()

		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
		)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 2 })
		)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 2 })
		)
		expect(editor.inputs.getIsPanning()).toBe(true)
		expect(editor.getCamera()).toMatchObject({ x: 200, y: 200, z: 1 })
	})

	it('ends a middle-mouse pan when the pointerup was missed', async () => {
		const { editor, canvas } = await setup()

		// Middle-mouse down starts panning immediately (no drag threshold).
		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 1, buttons: 4 })
		)
		expect(editor.inputs.getIsPanning()).toBe(true)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 4 })
		)
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })

		editor.inputs.setPointerVelocity(new Vec(0, 0))
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsPanning()).toBe(false)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.getInstanceState().cursor.type).not.toBe('grabbing')
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })
	})

	it('keeps a spacebar pan alive when a left-button pointerup was missed', async () => {
		const { editor, canvas } = await setup()

		// Hold space: activates panning (Editor key_down handling).
		await act(async () => {
			editor.dispatch({
				type: 'keyboard',
				name: 'key_down',
				key: ' ',
				code: 'Space',
				shiftKey: false,
				ctrlKey: false,
				altKey: false,
				metaKey: false,
				accelKey: false,
			})
			editor.emit('tick', 16)
		})
		expect(editor.inputs.getIsPanning()).toBe(true)

		// Left-button drag pans while space is held.
		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 0, buttons: 1 })
		)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 1 })
		)
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })

		// The left button's pointerup is lost outside the window. Recovery must
		// end the pointing state but keep panning active while space is held.
		editor.inputs.setPointerVelocity(new Vec(0, 0))
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.inputs.getIsPanning()).toBe(true)
		expect(editor.inputs.getIsSpacebarPanning()).toBe(true)
		// With no button down, moving the mouse must not pan.
		expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })
	})

	it('recovers a darwin ctrl+click pan only after the physical left button is released', async () => {
		const prevIsDarwin = tlenv.isDarwin
		tlenv.isDarwin = true
		try {
			const { editor, canvas } = await setup()

			// On darwin, ctrl+left maps to button 2, so this starts a right-click
			// pan while the physical buttons bit is 1 (left).
			await fire(
				editor,
				canvas,
				pointerEvent('pointerdown', {
					clientX: 100,
					clientY: 100,
					button: 0,
					buttons: 1,
					ctrlKey: true,
				})
			)
			await fire(
				editor,
				document.body,
				pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 1, ctrlKey: true })
			)
			expect(editor.inputs.getIsPanning()).toBe(true)
			expect(editor.getCamera()).toMatchObject({ x: 100, y: 100, z: 1 })

			// Bit 2 (right) is not set, but bit 1 (left) still is: the tracked
			// button 2 must not count as stale, or mac ctrl+drag panning breaks.
			await fire(
				editor,
				document.body,
				pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 1, ctrlKey: true })
			)
			expect(editor.inputs.getIsPanning()).toBe(true)
			expect(editor.getCamera()).toMatchObject({ x: 200, y: 200, z: 1 })

			// Once the left button is really up, the missed pointerup must recover.
			editor.inputs.setPointerVelocity(new Vec(0, 0))
			await fire(
				editor,
				document.body,
				pointerEvent('pointermove', { clientX: 400, clientY: 400, buttons: 0, ctrlKey: true })
			)
			expect(editor.inputs.getIsPanning()).toBe(false)
			expect(editor.inputs.getIsPointing()).toBe(false)
			expect(editor.getCamera()).toMatchObject({ x: 200, y: 200, z: 1 })
		} finally {
			tlenv.isDarwin = prevIsDarwin
		}
	})
})
