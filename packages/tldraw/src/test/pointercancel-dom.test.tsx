import { act } from '@testing-library/react'
import { Box, createShapeId } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// These tests drive the real DOM handlers in useCanvasEvents rather than
// dispatching synthetic editor events, because pointercancel is only ever
// observed at the DOM layer. jsdom is missing a few browser APIs those handlers
// rely on, so we polyfill them here.

if (typeof (globalThis as any).PointerEvent === 'undefined') {
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
}

interface PointerOpts {
	pointerId?: number
	pointerType?: string
	button?: number
}

function pointerEvent(
	type: 'pointerdown' | 'pointermove' | 'pointercancel',
	clientX: number,
	clientY: number,
	{ pointerId = 1, pointerType = 'touch', button = 0 }: PointerOpts = {}
) {
	const e = new (globalThis as any).PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX,
		clientY,
		// pointercancel never reports a pressed button
		button: type === 'pointercancel' ? -1 : button,
		pointerId,
		pointerType,
		isPrimary: pointerId === 1,
	})
	// jsdom's getCoalescedEvents returns an empty list, which makes tools that
	// opt into coalesced events (draw) drop every pointermove
	e.getCoalescedEvents = () => [e]
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
			{ id: ids.a, type: 'geo', x: 200, y: 0, props: { fill: 'solid', w: 100, h: 100 } },
		])
	})

	async function pointerDown(x: number, y: number, opts?: PointerOpts) {
		await act(async () => {
			canvas.dispatchEvent(pointerEvent('pointerdown', x, y, opts))
			editor.emit('tick', 16)
		})
	}
	// pointermove is listened for on the document body, not the canvas
	async function pointerMove(x: number, y: number, opts?: PointerOpts) {
		await act(async () => {
			document.body.dispatchEvent(pointerEvent('pointermove', x, y, opts))
			editor.emit('tick', 16)
		})
	}
	async function pointerCancel(x: number, y: number, opts?: PointerOpts) {
		await act(async () => {
			canvas.dispatchEvent(pointerEvent('pointercancel', x, y, opts))
			editor.emit('tick', 16)
		})
	}

	return { editor, canvas, pointerDown, pointerMove, pointerCancel }
}

describe('pointercancel via real DOM events', () => {
	it('ends a select-tool drag and clears the pressed state', async () => {
		const { editor, pointerDown, pointerMove, pointerCancel } = await setupScene()

		await pointerDown(250, 50)
		await pointerMove(300, 100)
		expect(editor.isIn('select.translating')).toBe(true)
		expect(editor.inputs.getIsPointing()).toBe(true)
		expect(editor.inputs.getIsDragging()).toBe(true)

		await pointerCancel(300, 100)

		expect(editor.isIn('select.idle')).toBe(true)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.inputs.getIsDragging()).toBe(false)
		expect(editor.inputs.buttons.size).toBe(0)
	})

	it('lets the next touch start a fresh interaction', async () => {
		const { editor, pointerDown, pointerMove, pointerCancel } = await setupScene()

		await pointerDown(250, 50)
		await pointerMove(300, 100)
		await pointerCancel(300, 100)

		await pointerDown(600, 600)
		expect(editor.isIn('select.pointing_canvas')).toBe(true)
	})

	it('closes an in-progress draw stroke', async () => {
		const { editor, pointerDown, pointerMove, pointerCancel } = await setupScene()

		await act(async () => {
			editor.setCurrentTool('draw')
		})
		await pointerDown(500, 500)
		await pointerMove(550, 550)
		expect(editor.isIn('draw.drawing')).toBe(true)
		const stroke = editor.getCurrentPageShapes().find((s) => s.type === 'draw')!
		expect(stroke).toMatchObject({ props: { isComplete: false } })

		await pointerCancel(550, 550)

		expect(editor.isIn('draw.idle')).toBe(true)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.getShape(stroke.id)).toMatchObject({ props: { isComplete: true } })
	})

	it('ignores a cancelled touch while a pen is drawing in pen mode', async () => {
		const { editor, pointerDown, pointerMove, pointerCancel } = await setupScene()

		await act(async () => {
			editor.setCurrentTool('draw')
			editor.updateInstanceState({ isPenMode: true })
		})
		await pointerDown(500, 500, { pointerId: 1, pointerType: 'pen' })
		await pointerMove(550, 550, { pointerId: 1, pointerType: 'pen' })
		expect(editor.isIn('draw.drawing')).toBe(true)

		// A palm lands and is rejected by the system
		await pointerCancel(700, 700, { pointerId: 2, pointerType: 'touch' })

		expect(editor.isIn('draw.drawing')).toBe(true)
		expect(editor.inputs.getIsPointing()).toBe(true)
	})

	it('restores the tool after a stylus-eraser press even if a rejected palm landed in between', async () => {
		const { editor, pointerDown, pointerCancel } = await setupScene()

		await act(async () => {
			editor.updateInstanceState({ isPenMode: true })
		})
		// The eraser button switches to the eraser tool until the pen lifts
		await pointerDown(500, 500, { pointerId: 1, pointerType: 'pen', button: 5 })
		expect(editor.getCurrentToolId()).toBe('eraser')

		// A palm lands; pen mode ignores it, so it must not replace the pen's button
		await pointerDown(700, 700, { pointerId: 2, pointerType: 'touch' })
		expect(editor.getCurrentToolId()).toBe('eraser')

		await pointerCancel(500, 500, { pointerId: 1, pointerType: 'pen' })

		expect(editor.getCurrentToolId()).toBe('select')
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.inputs.buttons.size).toBe(0)
	})

	it('does nothing when no press was registered', async () => {
		const { editor, pointerCancel } = await setupScene()

		await act(async () => {
			editor.select(ids.a)
		})

		await pointerCancel(500, 500)

		expect(editor.isIn('select.idle')).toBe(true)
		expect(editor.getSelectedShapeIds()).toEqual([ids.a])
	})
})

describe('pointercancel on the menu click capture overlay', () => {
	it('unmounts the overlay and ends the editor interaction', async () => {
		const { editor, pointerMove } = await setupScene()

		await act(async () => {
			editor.menus.addOpenMenu('test-menu')
		})
		const overlay = () =>
			document.querySelector('[data-testid="menu-click-capture.content"]') as HTMLElement | null
		expect(overlay()).not.toBeNull()

		await act(async () => {
			overlay()!.dispatchEvent(pointerEvent('pointerdown', 250, 50))
		})
		// The press closed the menu, but the overlay stays while the pointer is down
		expect(editor.menus.hasAnyOpenMenus()).toBe(false)
		expect(overlay()).not.toBeNull()

		// Dragging past the threshold replays pointerdown into the editor
		await act(async () => {
			overlay()!.dispatchEvent(pointerEvent('pointermove', 300, 100))
		})
		await pointerMove(320, 120)
		expect(editor.inputs.getIsPointing()).toBe(true)
		expect(editor.isIn('select.translating')).toBe(true)

		await act(async () => {
			overlay()!.dispatchEvent(pointerEvent('pointercancel', 320, 120))
			editor.emit('tick', 16)
		})

		expect(overlay()).toBeNull()
		expect(editor.isIn('select.idle')).toBe(true)
		expect(editor.inputs.getIsPointing()).toBe(false)
		expect(editor.inputs.buttons.size).toBe(0)
	})

	it('unmounts the overlay when a press is cancelled before it starts dragging', async () => {
		const { editor } = await setupScene()

		await act(async () => {
			editor.menus.addOpenMenu('test-menu')
		})
		const overlay = () =>
			document.querySelector('[data-testid="menu-click-capture.content"]') as HTMLElement | null

		await act(async () => {
			overlay()!.dispatchEvent(pointerEvent('pointerdown', 250, 50))
		})
		expect(overlay()).not.toBeNull()

		await act(async () => {
			overlay()!.dispatchEvent(pointerEvent('pointercancel', 250, 50))
		})

		expect(overlay()).toBeNull()
		expect(editor.isIn('select.idle')).toBe(true)
		expect(editor.inputs.getIsPointing()).toBe(false)
	})
})
