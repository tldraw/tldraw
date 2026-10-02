import { act, fireEvent } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { Tldraw } from '../../lib/Tldraw'
import { renderTldrawComponentWithEditor } from '../testutils/renderTldrawComponent'

let editor: Editor

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor
})

function moveFocusToCanvas() {
	act(() => {
		fireEvent.click(document.querySelector('.tl-skip-to-main-content')!)
	})
}

describe('Move focus to canvas', () => {
	it('selects the first shape in reading order', () => {
		const box1 = createShapeId()
		const box2 = createShapeId()
		act(() => {
			editor.createShapes([
				{ id: box1, type: 'geo', x: 0, y: 0 },
				{ id: box2, type: 'geo', x: 200, y: 0 },
			])
		})

		moveFocusToCanvas()

		expect(editor.getSelectedShapeIds()).toEqual([box1])
	})

	it('skips locked shapes', () => {
		const locked = createShapeId()
		const unlocked = createShapeId()
		act(() => {
			editor.createShapes([
				{ id: locked, type: 'geo', x: 0, y: 0, isLocked: true },
				{ id: unlocked, type: 'geo', x: 200, y: 0 },
			])
		})

		moveFocusToCanvas()

		expect(editor.getSelectedShapeIds()).toEqual([unlocked])
	})

	it('selects nothing when every shape is locked', () => {
		act(() => {
			editor.createShapes([{ id: createShapeId(), type: 'geo', x: 0, y: 0, isLocked: true }])
		})

		moveFocusToCanvas()

		expect(editor.getSelectedShapeIds()).toEqual([])
	})
})
