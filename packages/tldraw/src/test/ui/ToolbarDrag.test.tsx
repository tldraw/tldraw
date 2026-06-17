import { act, fireEvent } from '@testing-library/react'
import { Box } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

// These tests drive the real DOM pointer handlers in useDraggableEvents (the
// drag-out-of-toolbar feature) rather than dispatching synthetic editor events.
// jsdom is missing a few browser APIs those handlers rely on, so we polyfill
// them here, matching pinch-dom.test.tsx.

if (typeof (globalThis as any).PointerEvent === 'undefined') {
	;(globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
		pointerId: number
		pointerType: string
		isPrimary: boolean
		constructor(type: string, params: any = {}) {
			super(type, params)
			this.pointerId = params.pointerId ?? 0
			this.pointerType = params.pointerType ?? ''
			this.isPrimary = params.isPrimary ?? false
		}
	}
}
if (!Element.prototype.setPointerCapture) {
	Element.prototype.setPointerCapture = () => {}
	Element.prototype.releasePointerCapture = () => {}
	Element.prototype.hasPointerCapture = () => false
}

function pointerEvent(
	type: string,
	{ clientX, clientY, pointerType }: { clientX: number; clientY: number; pointerType: string }
) {
	return new (globalThis as any).PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX,
		clientY,
		button: 0,
		pointerId: 1,
		pointerType,
		isPrimary: true,
	})
}

async function setup() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)
	await act(async () => {
		editor.updateViewportScreenBounds(new Box(0, 0, 1000, 1000))
	})
	const arrowTool = document.querySelector('[data-testid="tools.arrow"]') as HTMLElement
	expect(arrowTool).toBeTruthy()
	return { editor, arrowTool }
}

// Drag a long way past any drag threshold so a mouse/touch gesture is
// unambiguously a drag, not a tap.
function dragOut(target: HTMLElement, pointerType: string) {
	fireEvent(target, pointerEvent('pointerdown', { clientX: 20, clientY: 20, pointerType }))
	fireEvent(target, pointerEvent('pointermove', { clientX: 220, clientY: 220, pointerType }))
}

it('creates a shape when dragging a tool out of the toolbar with a mouse', async () => {
	const { editor, arrowTool } = await setup()
	expect(editor.getCurrentPageShapes()).toHaveLength(0)

	dragOut(arrowTool, 'mouse')

	expect(editor.getCurrentPageShapes()).toHaveLength(1)
	expect(editor.getCurrentPageShapes()[0].type).toBe('arrow')
})

it('does not create a shape when dragging a tool out of the toolbar with a pen', async () => {
	const { editor, arrowTool } = await setup()
	expect(editor.getCurrentPageShapes()).toHaveLength(0)

	dragOut(arrowTool, 'pen')

	// A slight pen movement while tapping must not be misread as a drag gesture.
	expect(editor.getCurrentPageShapes()).toHaveLength(0)
})
