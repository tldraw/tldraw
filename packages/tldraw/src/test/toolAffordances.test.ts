import { createShapeId, TLGeoShape, TLPermission, TLRecordChange, TLShape } from '@tldraw/editor'
import { fakeLicense } from './fakeLicense'
import { TestEditor } from './TestEditor'

// Tools follow the advisory isChangePermitted: they don't start a gesture whose writes the host says
// the user can't make. Selection is never restricted.

const mine = createShapeId('mine')
const theirs = createShapeId('theirs')

function setup() {
	const editor = new TestEditor({
		isChangePermitted: (change: TLRecordChange<any>) => {
			const record = (change.next ?? change.prev) as TLShape
			return !(record.typeName === 'shape' && record.id === theirs && change.type !== 'create')
		},
	})
	fakeLicense(editor)
	editor.createShapes([
		{ id: mine, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: theirs, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } },
	])
	editor.selectNone()
	return editor
}
const shapeAt = (editor: TestEditor, id: typeof mine) => editor.getShape(id) as TLGeoShape

describe('tools and the advisory isChangePermitted', () => {
	it("selects a shape you can't update, but a drag doesn't move it", () => {
		const editor = setup()
		editor.pointerDown(350, 50, { target: 'shape', shape: shapeAt(editor, theirs) })
		editor.pointerMove(450, 50)
		expect(editor.getSelectedShapeIds()).toEqual([theirs])
		expect(editor.getPath()).not.toContain('translating')
		editor.pointerUp()
		expect(shapeAt(editor, theirs).x).toBe(300)
	})

	it('still drags a shape you can update', () => {
		const editor = setup()
		editor.pointerDown(50, 50, { target: 'shape', shape: shapeAt(editor, mine) })
		editor.pointerMove(150, 50).pointerUp()
		expect(shapeAt(editor, mine).x).toBe(100)
	})

	it("doesn't resize or rotate a selection you can't update", () => {
		const editor = setup()
		editor.select(theirs)
		editor.pointerDown(400, 100, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(500, 200)
		expect(editor.getPath()).not.toContain('resizing')
		editor.pointerUp()
		editor.pointerDown(400, 100, { target: 'selection', handle: 'bottom_right_rotate' })
		editor.pointerMove(500, 200)
		expect(editor.getPath()).not.toContain('rotating')
		editor.pointerUp()
		expect(shapeAt(editor, theirs)).toMatchObject({ x: 300, rotation: 0, props: { w: 100 } })
	})

	it("doesn't edit or crop a shape you can't update", () => {
		const editor = setup()
		expect(editor.canEditShape(theirs)).toBe(false)
		expect(editor.canEditShape(mine)).toBe(true)
	})

	it('erases only what you can delete', () => {
		const editor = setup()
		editor.setCurrentTool('eraser')
		// on the outlines: the shapes are hollow
		editor.pointerDown(300, 50).pointerUp()
		editor.pointerDown(0, 50).pointerUp()
		expect(editor.getCurrentPageShapeIds()).toEqual(new Set([theirs]))
	})

	it('changes nothing without a host answer or a license', () => {
		const editor = new TestEditor({ isChangePermitted: () => false })
		editor.createShapes([{ id: mine, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		editor.pointerDown(50, 50, { target: 'shape', shape: shapeAt(editor, mine) })
		editor.pointerMove(150, 50).pointerUp()
		expect(shapeAt(editor, mine).x).toBe(100)
	})
})

describe('gestures that create shapes, and the advisory can', () => {
	function withGrants(...granted: TLPermission[]) {
		const editor = new TestEditor({ isPermitted: (permission) => granted.includes(permission) })
		fakeLicense(editor)
		return editor
	}

	it('double click on the canvas makes a text shape only with create and update', () => {
		const createOnly = withGrants('tl:shape:create')
		createOnly.doubleClick(300, 300)
		expect(createOnly.getCurrentPageShapes()).toEqual([])

		const both = withGrants('tl:shape:create', 'tl:shape:update')
		both.doubleClick(300, 300)
		expect(both.getCurrentPageShapes().map((s) => s.type)).toEqual(['text'])
	})

	it('alt-drag clones only with create and update, and otherwise just moves', () => {
		for (const [granted, count] of [
			[['tl:shape:update'], 1],
			[['tl:shape:create', 'tl:shape:update'], 2],
		] as const) {
			const editor = withGrants(...granted)
			editor.createShapes([{ id: mine, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
			editor.pointerDown(
				50,
				50,
				{ target: 'shape', shape: shapeAt(editor, mine) },
				{ altKey: true }
			)
			editor.pointerMove(200, 50, { altKey: true }).pointerUp()
			expect(editor.getCurrentPageShapes()).toHaveLength(count)
		}
	})
})

describe('a host that answers only can', () => {
	function onlyCan(...granted: TLPermission[]) {
		const editor = new TestEditor({ isPermitted: (permission) => granted.includes(permission) })
		fakeLicense(editor)
		editor.createShapes([
			{ id: mine, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: theirs, type: 'text', x: 300, y: 300, props: {} as any },
		])
		editor.selectNone()
		return editor
	}

	it('without tl:shape:update: no drag, resize, handles or text editing', () => {
		const editor = onlyCan('tl:shape:create', 'tl:shape:delete')
		editor.pointerDown(50, 50, { target: 'shape', shape: shapeAt(editor, mine) })
		editor.pointerMove(150, 50).pointerUp()
		expect(shapeAt(editor, mine).x).toBe(0)
		editor.select(mine)
		editor.pointerDown(100, 100, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(200, 200)
		expect(editor.getPath()).not.toContain('resizing')
		editor.pointerUp()
		expect(editor.canEditShape(theirs)).toBe(false)
	})

	it('without tl:shape:delete: the eraser leaves shapes alone even while it is active', () => {
		const editor = onlyCan('tl:shape:create', 'tl:shape:update')
		editor.setCurrentTool('eraser')
		editor.pointerDown(0, 50).pointerUp()
		expect(editor.getShape(mine)).toBeDefined()
	})
})
