import { Driver } from '@tldraw/driver'
import {
	commentSchemaRecords,
	createShapeId,
	createTLSchema,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	TLShapeId,
	TLStateNodeConstructor,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CommentTool } from './comment-tool'

/**
 * Pointer-driven tests for the comment tool's placement affordances. These need a real editor
 * and real pointer dispatch: the behavior under test is how the tool's state transitions
 * (idle → pointing → dragging) maintain the editor's hinting state.
 */

let editor: Editor

function makeEditor(tool: TLStateNodeConstructor = CommentTool) {
	editor = new Editor({
		store: createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, tool],
		getContainer: () => document.body,
	})
	return new Driver(editor)
}

afterEach(() => {
	editor.dispose()
})

function makeShape(x = 100, y = 100, w = 100, h = 50): TLShapeId {
	const id = createShapeId()
	editor.createShape({ id, type: 'geo', x, y, props: { w, h } })
	return id
}

describe('comment tool placement hints', () => {
	let driver: Driver

	beforeEach(() => {
		driver = makeEditor()
	})

	it('hints the shape under the pointer while hovering', () => {
		const id = makeShape()
		editor.setCurrentTool('comment')
		driver.pointerMove(150, 125)
		expect(editor.getHintingShapeIds()).toEqual([id])

		driver.pointerMove(400, 400)
		expect(editor.getHintingShapeIds()).toEqual([])
	})

	it('keeps hinting the anchor target while the composer follows the pointer', () => {
		const id = makeShape()
		editor.setCurrentTool('comment')
		driver.pointerMove(400, 400)
		expect(editor.getHintingShapeIds()).toEqual([])

		// Press away from the shape, then drag the follow composer over it: the shape a release
		// would anchor to stays hinted, exactly like the idle hover.
		driver.pointerDown(400, 400)
		driver.pointerMove(150, 125)
		expect(editor.isIn('comment.pointing')).toBe(true)
		expect(editor.getHintingShapeIds()).toEqual([id])

		// ...and dragging back off the shape drops the hint.
		driver.pointerMove(400, 400)
		expect(editor.getHintingShapeIds()).toEqual([])
	})

	it('clears the hint when the tool exits', () => {
		const id = makeShape()
		editor.setCurrentTool('comment')
		driver.pointerMove(150, 125)
		expect(editor.getHintingShapeIds()).toEqual([id])

		// Releasing places the comment and hands back to select, which owns its own hover state.
		driver.pointerDown(150, 125)
		driver.pointerUp(150, 125)
		expect(editor.isIn('select')).toBe(true)
		expect(editor.getHintingShapeIds()).toEqual([])
	})
})

describe('comment tool placement hints with regions enabled', () => {
	it('clears the hint when a drag becomes a region', () => {
		const driver = makeEditor(CommentTool.configure({ enableRegions: true }))
		const id = makeShape()
		editor.setCurrentTool('comment')
		driver.pointerMove(150, 125)
		expect(editor.getHintingShapeIds()).toEqual([id])

		// Past the drag threshold this is a region draw — a single-shape outline under the dashed
		// box would be stale, so the hint clears even with the pointer still over the shape.
		driver.pointerDown(150, 125)
		driver.pointerMove(180, 140)
		expect(editor.isIn('comment.dragging')).toBe(true)
		expect(editor.getHintingShapeIds()).toEqual([])
	})
})
