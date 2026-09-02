import { act } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// These tests drive the toolbar button's real pointer handlers (useDraggableEvents) rather than
// calling onDragStart directly, so the drag-out threshold is exercised the way a device exercises
// it. jsdom has no layout, so the toolbar's rect is stubbed.

// A 400×48 toolbar pill along the bottom of the window.
const toolbarRect = { left: 100, top: 900, right: 500, bottom: 948 }

type PointerType = 'mouse' | 'pen' | 'touch'

function pointerEvent(type: string, x: number, y: number, pointerType: PointerType) {
	return new PointerEvent(type, {
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

// jsdom doesn't synthesize a click from pointerup, so dispatch it by hand.
async function release(x: number, y: number, pointerType: PointerType) {
	await act(async () => {
		button.dispatchEvent(pointerEvent('pointerup', x, y, pointerType))
		button.dispatchEvent(
			new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y })
		)
	})
}

// The editor queues pointer moves until the next tick.
async function tick() {
	await act(async () => {
		editor.emit('tick', 16)
	})
}

function shapeTypes() {
	return editor.getCurrentPageShapes().map((s) => s.type)
}

describe('dragging a tool out of the toolbar', () => {
	it('does not start a drag while the pointer stays inside the toolbar, however far it moves', async () => {
		await press(300, 924, 'mouse')
		await move(306, 924, 'mouse') // past the 4px mouse threshold
		await move(480, 948, 'mouse') // 180px, past the 25px coarse threshold, right on the bottom edge
		expect(shapeTypes()).toEqual([])

		await release(480, 948, 'mouse')
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
		expect(editor.getPath()).toBe('select.translating')

		// The shape is created at the press point and moved under the pointer right away.
		await tick()
		const { x, y } = editor.getShapePageBounds(editor.getCurrentPageShapes()[0])!.center
		const pointer = editor.screenToPage({ x: 300, y: 880 })
		expect({ x, y }).toEqual({ x: pointer.x, y: pointer.y })

		// The click that follows a drag doesn't select the tool.
		await release(300, 880, 'mouse')
		expect(editor.getPath()).toBe('select.idle')
		expect(shapeTypes()).toEqual(['arrow'])
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
		await press(300, 902, 'pen')
		// In the browser the coarse pointer flag reaches the instance state a frame after the
		// pointer down, so it still says "mouse" during the first pen tap after mouse use. The sync
		// is synchronous in tests, so force the stale value by hand.
		await act(async () => {
			editor.updateInstanceState({ isCoarsePointer: false })
		})
		await move(300, 890, 'pen') // 12px travelled: past the mouse threshold, not the pen one
		expect(shapeTypes()).toEqual([])
	})
})
