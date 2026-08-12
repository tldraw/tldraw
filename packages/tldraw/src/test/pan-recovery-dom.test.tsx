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

// Editor.dispatch mutates info.name in place (e.g. pointer_up → right_click),
// so spy call args can't be inspected after the fact: capture names at call time.
function captureDispatchNames(editor: any): string[] {
	const names: string[] = []
	const original = editor.dispatch.bind(editor)
	vi.spyOn(editor, 'dispatch').mockImplementation((info: any) => {
		names.push(info.name)
		return original(info)
	})
	return names
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

	it('delivers a static right-click within the drag threshold to the state chart', async () => {
		const { editor, canvas } = await setup()

		await act(async () => {
			editor.createShape({ type: 'geo', x: 500, y: 500 })
			editor.select(editor.getCurrentPageShapes()[0].id)
		})
		expect(editor.getSelectedShapeIds()).toHaveLength(1)

		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
		)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 102, clientY: 101, buttons: 2 })
		)
		await fire(
			editor,
			canvas,
			pointerEvent('pointerup', { clientX: 102, clientY: 101, button: 2, buttons: 0 })
		)
		// The right_click reached SelectTool's idle, which resolves the selection
		// at the click point: empty canvas clears it.
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('suppresses a right-click released past the screen-space threshold at zoom 2', async () => {
		const { editor, canvas } = await setup()

		await act(async () => {
			editor.createShape({ type: 'geo', x: 500, y: 500 })
			editor.select(editor.getCurrentPageShapes()[0].id)
			editor.setCamera(new Vec(0, 0, 2), { immediate: true })
		})
		const selectedIds = editor.getSelectedShapeIds()

		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
		)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 101, clientY: 100, buttons: 2 })
		)
		expect(editor.inputs.getIsRightPointing()).toBe(true)
		expect(editor.inputs.getIsPanning()).toBe(false)

		// A fast flick: the release lands 6px screen from the origin (past the
		// 4px threshold → suppressed) but only 3px page at zoom 2. A page-space
		// threshold would deliver the right_click and clear the selection.
		await fire(
			editor,
			canvas,
			pointerEvent('pointerup', { clientX: 106, clientY: 100, button: 2, buttons: 0 })
		)
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

	it('swallows a late real pointerup after recovery instead of firing a contextmenu', async () => {
		const { editor, canvas } = await setup()

		const contextmenu = vi.fn()
		canvas.addEventListener('contextmenu', contextmenu)

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

		// Recovery ends the pan on a stale-buttons move.
		editor.inputs.setPointerVelocity(new Vec(0, 0))
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsPanning()).toBe(false)

		// The real pointerup arrives late anyway: must be swallowed, not
		// processed as a fresh static right-click with a contextmenu.
		const dispatched = captureDispatchNames(editor)
		await fire(
			editor,
			canvas,
			pointerEvent('pointerup', { clientX: 300, clientY: 300, button: 2, buttons: 0 })
		)
		expect(contextmenu).not.toHaveBeenCalled()
		expect(dispatched.filter((name) => name === 'pointer_up')).toHaveLength(0)
	})

	it('swallows a late darwin pointerup that resolves to button 0 once ctrl is released', async () => {
		const prevIsDarwin = tlenv.isDarwin
		tlenv.isDarwin = true
		try {
			const { editor, canvas } = await setup()

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

			editor.inputs.setPointerVelocity(new Vec(0, 0))
			await fire(
				editor,
				document.body,
				pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0, ctrlKey: true })
			)
			expect(editor.inputs.getIsPanning()).toBe(false)

			// Ctrl released before the late pointerup → it resolves to button 0,
			// but still belongs to the recovered ctrl+click: swallow it.
			const dispatched = captureDispatchNames(editor)
			await fire(
				editor,
				canvas,
				pointerEvent('pointerup', { clientX: 300, clientY: 300, button: 0, buttons: 0 })
			)
			expect(dispatched.filter((name) => name === 'pointer_up')).toHaveLength(0)
		} finally {
			tlenv.isDarwin = prevIsDarwin
		}
	})

	it('swallows a late darwin spacebar-pan pointerup that resolves to button 2 under ctrl', async () => {
		const prevIsDarwin = tlenv.isDarwin
		tlenv.isDarwin = true
		try {
			const { editor, canvas } = await setup()
			const contextmenu = vi.fn()
			canvas.addEventListener('contextmenu', contextmenu)

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

			// The left button's pointerup is lost outside; recovery records button 0.
			editor.inputs.setPointerVelocity(new Vec(0, 0))
			await fire(
				editor,
				document.body,
				pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
			)
			expect(editor.inputs.getIsPointing()).toBe(false)

			// The late pointerup arrives with ctrl held → resolves to button 2. It
			// still belongs to the recovered left press: swallow it instead of
			// firing a static right-click contextmenu.
			const dispatched = captureDispatchNames(editor)
			await fire(
				editor,
				canvas,
				pointerEvent('pointerup', {
					clientX: 300,
					clientY: 300,
					button: 0,
					buttons: 0,
					ctrlKey: true,
				})
			)
			expect(dispatched.filter((name) => name === 'pointer_up')).toHaveLength(0)
			expect(contextmenu).not.toHaveBeenCalled()
		} finally {
			tlenv.isDarwin = prevIsDarwin
		}
	})

	it('swallows a late pointerup landing on the menu click capture overlay', async () => {
		const { editor } = await setup()

		await act(async () => {
			editor.menus.addOpenMenu('test-menu')
		})
		const overlay = document.querySelector(
			'[data-testid="menu-click-capture.content"]'
		) as HTMLElement
		expect(overlay).toBeTruthy()

		// Right pointerdown on the overlay is forwarded to the canvas handler,
		// so dragging starts a pan.
		await fire(
			editor,
			overlay,
			pointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 2, buttons: 2 })
		)
		await fire(
			editor,
			overlay,
			pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 2 })
		)
		expect(editor.inputs.getIsPanning()).toBe(true)

		// Missed pointerup outside: the re-entry move over the overlay must not
		// be forwarded as a drag, and recovery must end the pan.
		editor.inputs.setPointerVelocity(new Vec(0, 0))
		await fire(
			editor,
			overlay,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsPanning()).toBe(false)
		expect(editor.inputs.getIsPointing()).toBe(false)

		// The late real pointerup lands on the overlay's own handler: it must
		// consult the recovery record too, not re-dispatch pointer_up.
		const dispatched = captureDispatchNames(editor)
		await fire(
			editor,
			overlay,
			pointerEvent('pointerup', { clientX: 300, clientY: 300, button: 2, buttons: 0 })
		)
		expect(dispatched.filter((name) => name === 'pointer_up')).toHaveLength(0)
	})

	it('processes a fresh right-click normally after a recovered pan', async () => {
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
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 200, clientY: 200, buttons: 2 })
		)
		editor.inputs.setPointerVelocity(new Vec(0, 0))
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 300, clientY: 300, buttons: 0 })
		)
		expect(editor.inputs.getIsPanning()).toBe(false)
		expect(editor.getSelectedShapeIds()).toEqual(selectedIds)

		// A new press clears the recovery record: this static right-click's
		// pointerup must reach the state chart.
		await fire(
			editor,
			canvas,
			pointerEvent('pointerdown', { clientX: 400, clientY: 400, button: 2, buttons: 2 })
		)
		await fire(
			editor,
			document.body,
			pointerEvent('pointermove', { clientX: 402, clientY: 401, buttons: 2 })
		)
		await fire(
			editor,
			canvas,
			pointerEvent('pointerup', { clientX: 402, clientY: 401, button: 2, buttons: 0 })
		)
		expect(editor.getSelectedShapeIds()).toEqual([])
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
