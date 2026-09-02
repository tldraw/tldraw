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
import { commentsSidebarOpen, pendingComment, regionDraft } from './state'

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

function makeFrame(x = 300, y = 100, w = 200, h = 200): TLShapeId {
	const id = createShapeId()
	editor.createShape({ id, type: 'frame', x, y, props: { w, h } })
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

		// Select owns its own hover state, so the comment hint leaves with the tool.
		editor.setCurrentTool('select')
		expect(editor.getHintingShapeIds()).toEqual([])
	})
})

describe('comment tool placement lifecycle', () => {
	let driver: Driver

	beforeEach(() => {
		driver = makeEditor()
	})

	it('stays in the tool with the composer open after placing', () => {
		editor.setCurrentTool('comment')
		driver.pointerDown(400, 300)
		driver.pointerUp(400, 300)
		// Placement opens the composer but the interaction isn't over — the tool holds on until
		// the comment is posted or dismissed, so the surrounding UI stays stable.
		expect(editor.isIn('comment.idle')).toBe(true)
		expect(pendingComment.get(editor)).toEqual({
			anchor: { type: 'point', x: 400, y: 300 },
			point: { x: 400, y: 300 },
		})
	})

	it('re-places the composer on a second click', () => {
		editor.setCurrentTool('comment')
		driver.pointerDown(400, 300)
		driver.pointerUp(400, 300)
		driver.pointerDown(200, 200)
		driver.pointerUp(200, 200)
		expect(editor.isIn('comment.idle')).toBe(true)
		expect(pendingComment.get(editor)).toEqual({
			anchor: { type: 'point', x: 200, y: 200 },
			point: { x: 200, y: 200 },
		})
	})

	it('drops the pending composer when the tool exits', () => {
		editor.setCurrentTool('comment')
		driver.pointerDown(400, 300)
		driver.pointerUp(400, 300)
		expect(pendingComment.get(editor)).not.toBeNull()

		// A direct tool switch (toolbar, shortcut) abandons the draft composer — it belongs to
		// the tool. The text itself survives in the comment draft store.
		editor.setCurrentTool('select')
		expect(pendingComment.get(editor)).toBeNull()
	})

	it('closes the comments sidebar for the whole interaction', () => {
		commentsSidebarOpen.set(editor, true)
		editor.setCurrentTool('comment')
		expect(commentsSidebarOpen.get(editor)).toBe(false)

		// ...and placing doesn't reopen it: the tool (and the closed sidebar) hold through the
		// composer. Reopening is the host's button, never a side effect of leaving the tool.
		driver.pointerDown(400, 300)
		driver.pointerUp(400, 300)
		expect(editor.isIn('comment.idle')).toBe(true)
		expect(commentsSidebarOpen.get(editor)).toBe(false)
	})

	it('escape leaves the tool for select and drops the draft', () => {
		editor.setCurrentTool('comment')
		driver.pointerDown(400, 300)
		driver.pointerUp(400, 300)
		editor.cancel()
		expect(editor.isIn('select')).toBe(true)
		expect(pendingComment.get(editor)).toBeNull()
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

	it('stays in the tool with the composer open after a region drag', () => {
		const driver = makeEditor(CommentTool.configure({ enableRegions: true }))
		editor.setCurrentTool('comment')
		driver.pointerDown(100, 100)
		driver.pointerMove(200, 180)
		driver.pointerUp(200, 180)
		expect(editor.isIn('comment.idle')).toBe(true)
		expect(pendingComment.get(editor)).toEqual({
			anchor: { type: 'region', x: 100, y: 100, w: 100, h: 80, pinX: 1, pinY: 1 },
			point: { x: 200, y: 180 },
		})
	})

	it('does not hint a shape under the pin corner of a placed region', () => {
		const driver = makeEditor(CommentTool.configure({ enableRegions: true }))
		makeShape(100, 100)
		editor.setCurrentTool('comment')
		// Release on top of the shape: a region anchors to its rectangle, so the outline that
		// normally previews a shape anchor would be a lie here.
		driver.pointerDown(50, 50)
		driver.pointerMove(150, 125)
		driver.pointerUp(150, 125)
		expect(editor.isIn('comment.idle')).toBe(true)
		expect(editor.getHintingShapeIds()).toEqual([])
	})

	it('drops the region draft when the tool exits mid-drag', () => {
		const driver = makeEditor(CommentTool.configure({ enableRegions: true }))
		editor.setCurrentTool('comment')
		driver.pointerDown(100, 100)
		driver.pointerMove(200, 180)
		expect(regionDraft.get(editor)).not.toBeNull()

		// A direct tool switch (shortcut, toolbar) mid-drag must not strand the drawn rectangle.
		editor.setCurrentTool('select')
		expect(regionDraft.get(editor)).toBeNull()
	})
})

describe('comment tool anchoring to frames', () => {
	let driver: Driver

	beforeEach(() => {
		driver = makeEditor()
	})

	it('hints a frame when hovering its empty interior', () => {
		// A frame is hit only on its edge/label by default; the comment tool passes hitFrameInside
		// so a click in its body anchors the frame. (300,100)–(500,300): (400,200) is well inside,
		// clear of the edges and the (above-frame) label.
		const frame = makeFrame(300, 100, 200, 200)
		editor.setCurrentTool('comment')
		driver.pointerMove(400, 200)
		expect(editor.getHintingShapeIds()).toEqual([frame])
	})

	it('a shape over the frame still wins the hit', () => {
		const frame = makeFrame(300, 100, 200, 200)
		const child = makeShape(340, 140, 60, 40) // sits inside the frame, drawn above it
		editor.setCurrentTool('comment')
		driver.pointerMove(370, 160)
		expect(editor.getHintingShapeIds()).toEqual([child])
		// ...and the frame's empty interior beside it still anchors the frame.
		driver.pointerMove(470, 260)
		expect(editor.getHintingShapeIds()).toEqual([frame])
	})

	it('keeps hinting a frame while the composer follows the pointer into it', () => {
		// The click-drag path, not just idle hover: press away from the frame, then drag the follow
		// composer into its body. The pointing state hints the anchor target too, so the frame stays
		// hinted while dragging over it (regions are off by default, so this doesn't become a region).
		const frame = makeFrame(300, 100, 200, 200)
		editor.setCurrentTool('comment')
		driver.pointerMove(50, 50)
		driver.pointerDown(50, 50)
		driver.pointerMove(400, 200)
		expect(editor.isIn('comment.pointing')).toBe(true)
		expect(editor.getHintingShapeIds()).toEqual([frame])

		// ...and dragging back off the frame clears it.
		driver.pointerMove(50, 400)
		expect(editor.getHintingShapeIds()).toEqual([])
	})
})
