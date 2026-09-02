import { act } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// These tests drive the toolbar button's real pointer handlers (useDraggableEvents) rather than
// calling onDragStart directly, so the drag-out threshold is exercised the way a device exercises
// it. jsdom is missing PointerEvent, pointer capture and layout, so those are polyfilled here.

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

// A 400×48 toolbar pill along the bottom of the window.
const toolbarRect = { left: 100, top: 900, right: 500, bottom: 948 }

type PointerType = 'mouse' | 'pen' | 'touch'

function pointerEvent(type: string, x: number, y: number, pointerType: PointerType) {
	return new (globalThis as any).PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		button: 0,
		pointerId: 1,
		pointerType,
		isPrimary: true,
	})
}

let editor: Editor
let button: HTMLElement

beforeEach(async () => {
	;({ editor } = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	}))
	button = document.querySelector('[data-testid="tools.arrow"]') as HTMLElement
	const toolbar = button.closest('.tlui-toolbar') as HTMLElement
	toolbar.getBoundingClientRect = () =>
		({
			...toolbarRect,
			x: toolbarRect.left,
			y: toolbarRect.top,
			width: toolbarRect.right - toolbarRect.left,
			height: toolbarRect.bottom - toolbarRect.top,
			toJSON() {},
		}) as DOMRect
})

async function press(x: number, y: number, pointerType: PointerType) {
	await act(async () => {
		button.dispatchEvent(pointerEvent('pointerdown', x, y, pointerType))
	})
}

// The button holds pointer capture, so moves keep arriving on it after the pointer leaves it.
async function move(x: number, y: number, pointerType: PointerType) {
	await act(async () => {
		button.dispatchEvent(pointerEvent('pointermove', x, y, pointerType))
	})
}

async function release(x: number, y: number, pointerType: PointerType) {
	await act(async () => {
		button.dispatchEvent(pointerEvent('pointerup', x, y, pointerType))
		button.dispatchEvent(
			new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y })
		)
	})
}

function shapeTypes() {
	return editor.getCurrentPageShapes().map((s) => s.type)
}

describe('dragging a tool out of the toolbar', () => {
	it('does not start a drag while the pointer stays inside the toolbar, however far it moves', async () => {
		await press(300, 924, 'mouse')
		await move(306, 924, 'mouse') // past the 4px mouse threshold
		await move(300, 947, 'mouse') // down to the bottom edge
		expect(shapeTypes()).toEqual([])

		await release(300, 947, 'mouse')
		expect(shapeTypes()).toEqual([])
		expect(editor.getCurrentToolId()).toBe('arrow') // the press was a click
	})

	it('treats a pen tap that slides along the toolbar as a click', async () => {
		await press(300, 924, 'pen')
		await move(340, 926, 'pen') // 40px along the toolbar, past the 25px coarse threshold
		await release(340, 926, 'pen')

		expect(shapeTypes()).toEqual([])
		expect(editor.getCurrentToolId()).toBe('arrow')
	})

	it('starts a drag once the pointer leaves the toolbar', async () => {
		await press(300, 924, 'mouse')
		await move(300, 880, 'mouse')

		expect(shapeTypes()).toEqual(['arrow'])
		expect(editor.isIn('select.translating')).toBe(true)
	})

	it('guards a pen press at the toolbar edge with the coarse threshold', async () => {
		await press(300, 902, 'pen') // 2px inside the top edge
		await move(300, 895, 'pen') // 5px outside, 7px travelled
		expect(shapeTypes()).toEqual([])

		await move(300, 870, 'pen') // 32px travelled
		expect(shapeTypes()).toEqual(['arrow'])
	})

	it('guards a mouse press at the toolbar edge with the mouse threshold', async () => {
		await press(300, 902, 'mouse')
		await move(300, 899, 'mouse') // 1px outside, 3px travelled
		expect(shapeTypes()).toEqual([])

		await move(300, 895, 'mouse') // 7px travelled
		expect(shapeTypes()).toEqual(['arrow'])
	})

	it('reads the pointer type from the event, not the editor coarse pointer state', async () => {
		// The instance state flag syncs a frame after the first pointer down, so it still says
		// "mouse" during the first pen tap after mouse use.
		await act(async () => {
			editor.updateInstanceState({ isCoarsePointer: false })
		})
		await press(300, 902, 'pen')
		await move(300, 890, 'pen') // 12px travelled: past the mouse threshold, not the pen one
		expect(shapeTypes()).toEqual([])
	})
})
