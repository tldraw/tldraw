import {
	TLBinding,
	TLBindingId,
	TLFrameShape,
	TLGeoShape,
	TLShapeId,
	approximately,
	createShapeId,
	structuredClone,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	box3: createShapeId('box3'),
	frame1: createShapeId('frame1'),
	frame2: createShapeId('frame2'),
	frame3: createShapeId('frame3'),
	frame4: createShapeId('frame4'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{
			id: ids.frame1,
			type: 'frame',
			x: 0,
			y: 0,
			props: {
				w: 100, // ! we're using w to identify the clones
				h: 100,
			},
		},
		{
			id: ids.frame2,
			type: 'frame',
			x: 0,
			y: 100,
			props: {
				w: 101,
				h: 100,
			},
		},
		{
			id: ids.frame3,
			type: 'frame',
			x: 0,
			y: 200,
			props: {
				w: 102,
				h: 100,
			},
		},
		{
			id: ids.frame4,
			type: 'frame',
			x: 0,
			y: 300,
			props: {
				w: 103,
				h: 100,
			},
		},
		{
			id: ids.box1,
			type: 'geo',
			x: 500,
			y: 500,
			props: {
				w: 88,
			},
		},
		{
			id: ids.box2,
			type: 'geo',
			x: 600,
			y: 600,
			props: {
				w: 89,
			},
		},
		{
			id: ids.box3,
			type: 'geo',
			x: 700,
			y: 700,
			props: {
				w: 90,
			},
		},
	])
})

function getShapes() {
	const arr = editor.getCurrentPageShapes() as any[]

	const results = { old: {}, new: {} } as {
		old: Record<string, TLGeoShape | TLFrameShape>
		new: Record<string, TLGeoShape | TLFrameShape>
	}

	Object.entries(ids).map(([normalId, shapeId]) => {
		const shape = editor.getShape(shapeId as any) as any
		const newShape = arr.find((s) => s.id !== shapeId && s.props.w === shape?.props.w)
		results.old[normalId] = shape
		results.new[normalId] = newShape
	})

	return results
}

it('Gets pasted shapes correctly', () => {
	editor.select(ids.box1, ids.box2, ids.frame1, ids.box3)
	editor.copy()
	editor.selectNone()
	let shapes = getShapes()

	expect(editor.getCurrentPageShapesSorted().map((m) => m.id)).toStrictEqual([
		shapes.old.frame1.id,
		shapes.old.frame2.id,
		shapes.old.frame3.id,
		shapes.old.frame4.id,
		shapes.old.box1.id,
		shapes.old.box2.id,
		shapes.old.box3.id,
	])

	editor.paste()

	shapes = getShapes()

	// The pasted frame (at 0,0) merely touches frame2's edge (at 0,100),
	// so it stays at the page level rather than being reparented.
	expect(editor.getCurrentPageShapesSorted().map((m) => m.id)).toStrictEqual([
		shapes.old.frame1.id,
		shapes.old.frame2.id,
		shapes.old.frame3.id,
		shapes.old.frame4.id,
		shapes.old.box1.id,
		shapes.old.box2.id,
		shapes.old.box3.id,
		shapes.new.frame1.id,
		shapes.new.box1.id,
		shapes.new.box2.id,
		shapes.new.box3.id,
	])
})

describe('When pasting', () => {
	it('pastes shapes onto the page', () => {
		/*
    Before:
    page
      - frame1
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3

    After:
    page
      - frame1
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3
      - box1copy
      - box2copy
    */

		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.selectNone()
		editor.paste()

		const shapes = getShapes()
		expect(shapes.new.box1?.parentId).toBe(editor.getCurrentPageId())
		expect(shapes.new.box2?.parentId).toBe(editor.getCurrentPageId())

		expect(editor.getCurrentPageShapesSorted().map((m) => m.id)).toStrictEqual([
			shapes.old.frame1.id,
			shapes.old.frame2.id,
			shapes.old.frame3.id,
			shapes.old.frame4.id,
			shapes.old.box1.id,
			shapes.old.box2.id,
			shapes.old.box3.id,
			shapes.new.box1.id,
			shapes.new.box2.id,
		])
	})

	it('pastes shapes as children of the selected shape when shape is a frame', () => {
		/*
    Before:
    page
      - frame1 *
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3

    After:
    page
      - frame1
        - box1copy *
        - box2copy *
      - frame2
      - frame3
      - frame4
      - box1
      - box2
      - box3
    */
		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.select(ids.frame1)
		editor.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(shapes.old.frame1.id)
		expect(shapes.new.box2?.parentId).toBe(shapes.old.frame1.id)

		// Should put the pasted shapes centered in the frame
		editor.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(editor.getSelectionPageCenter()).toMatchObject(
			editor.getPageCenter(editor.getShape(ids.frame1)!)!
		)
	})

	it('pastes shapes as children of the most common ancestor', () => {
		editor.reparentShapes([ids.frame3], ids.frame1)
		editor.reparentShapes([ids.frame4], ids.frame2)
		editor.reparentShapes([ids.box1], ids.frame3)
		editor.reparentShapes([ids.box2], ids.frame4)
		/*
    Before:
    page
      - frame1 
        - frame3
          - box1 *
      - frame2 
        - frame4
          - box2 *
      - box3

    After:
    page
      - frame1 
        - frame3
          - box1  
      - frame2 
        - frame4
          - box2
      - box3
      - box1copy *
      - box2copy *
    */

		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(editor.getCurrentPageId())
		expect(shapes.new.box2?.parentId).toBe(editor.getCurrentPageId())

		// Should put the pasted shapes centered in the frame
		editor.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(editor.getShapePageBounds(shapes.old.box1)).toMatchObject(
			editor.getShapePageBounds(shapes.new.box1)!
		)
	})

	it('pastes shapes as children of the most common ancestor', () => {
		editor.reparentShapes([ids.frame3], ids.frame1)
		editor.reparentShapes([ids.frame4], ids.frame1)
		editor.reparentShapes([ids.box1], ids.frame3)
		editor.reparentShapes([ids.box2], ids.frame4)
		/*
    Before:
    page
      - frame1 
        - frame3
          - box1 *
        - frame4
          - box2 *
      - frame2 
      - box3

    After:
    page
      - frame1 
        - frame3
          - box1  
        - frame4
          - box2 
        - box1copy *
        - box2copy *
      - frame2 
      - box2
      - box3
    */

		editor.select(ids.box1, ids.box2)
		editor.copy()
		editor.paste()

		const shapes = getShapes()

		// Should make the pasted shapes the children of the frame
		expect(shapes.new.box1?.parentId).toBe(shapes.old.frame1.id)
		expect(shapes.new.box2?.parentId).toBe(shapes.old.frame1.id)

		// Should put the pasted shapes centered in the frame
		editor.select(shapes.new.box1!.id, shapes.new.box1!.id)
		expect(editor.getSelectionPageCenter()).toMatchObject(editor.getPageCenter(shapes.old.frame1)!)
	})
})

it('pastes shapes with children', () => {
	editor.reparentShapes([ids.box1, ids.box2], ids.frame3)
	/*
  Before:
  page
    - frame1 
    - frame2 
    - frame3 *
      - box1 
      - box2 
    - frame4
    - box3

  After:
  page
    - frame1 
    - frame2 
    - frame3
      - box1
      - box2
    - frame4
    - box3
    - frame3copy
      - box1copy
      - box2copy
  */

	editor.select(ids.frame3)
	editor.copy()
	editor.paste()

	const shapes = getShapes()

	// Should make the pasted shapes the children of the frame
	expect(shapes.new.box1.parentId).toBe(shapes.new.frame3.id)
	expect(shapes.new.box2.parentId).toBe(shapes.new.frame3.id)
	expect(shapes.new.frame3.parentId).toBe(editor.getCurrentPageId())
})

describe('When pasting into frames...', () => {
	it('Does not paste into a clipped frame', () => {
		// clear the page
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		editor
			// move the two frames far from all other shapes
			.createShapes([
				{
					id: ids.frame1,
					type: 'frame',
					x: 2000,
					y: 2000,
					props: {
						w: 100,
						h: 100,
					},
				},
				{
					id: ids.frame2,
					type: 'frame',
					x: 2000,
					y: 2000,
					props: {
						w: 100,
						h: 100,
					},
				},
				{
					id: ids.box1,
					type: 'geo',
					x: 500,
					y: 500,
				},
			])
			.setScreenBounds({ x: 0, y: 0, w: 1000, h: 1000 })

		// put frame2 inside frame1
		editor.reparentShapes([ids.frame2], ids.frame1)

		// move frame 2 so that it's clipped AND so that it covers the whole viewport
		editor
			.updateShapes([
				{
					id: ids.frame2,
					type: 'frame',
					x: 50,
					y: 50,
					props: {
						w: 2000,
						h: 2000,
					},
				},
			])
			// Make sure that frame 1 is brought to front
			.select(ids.frame1)
			.bringToFront(editor.getSelectedShapeIds())

		editor.setCamera({ x: -2000, y: -2000, z: 1 })

		// Copy box 1 (should be out of viewport)
		editor.select(ids.box1).copy()

		const shapesBefore = editor.getCurrentPageShapes()
		// Paste it
		editor.paste()

		const newShape = editor.getCurrentPageShapes().find((s) => !shapesBefore.includes(s))!

		// it should be on the canvas, NOT a child of frame2
		expect(newShape.parentId).not.toBe(ids.frame2)
	})

	it('keeps things in the right place', () => {
		// clear the page
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		// create a small box and copy it
		editor.createShapes([
			{
				type: 'geo',
				x: 0,
				y: 0,
				props: {
					geo: 'rectangle',
					w: 10,
					h: 10,
				},
			},
		])
		editor.selectAll().copy()
		// now delete it
		editor.deleteShapes(editor.getSelectedShapeIds())

		// create a big frame away from the origin, the size of the viewport
		editor
			.createShapes([
				{
					id: ids.frame1,
					type: 'frame',
					x: editor.getViewportScreenBounds().w,
					y: editor.getViewportScreenBounds().h,
					props: {
						w: editor.getViewportScreenBounds().w,
						h: editor.getViewportScreenBounds().h,
					},
				},
			])
			.selectAll()
		// rotate the frame for hard mode
		editor.rotateSelection(45)
		// center on the center of the frame
		editor.setCamera({
			x: -editor.getViewportScreenBounds().w,
			y: -editor.getViewportScreenBounds().h,
			z: 1,
		})
		// paste the box
		editor.paste()
		const boxId = editor.getOnlySelectedShape()!.id
		// it should be a child of the frame
		expect(editor.getOnlySelectedShape()?.parentId).toBe(ids.frame1)
		// it should have pageBounds of 10x10 because it is not rotated relative to the viewport
		expect(editor.getShapePageBounds(boxId)).toMatchObject({ w: 10, h: 10 })
		// it should be in the middle of the frame
		const framePageCenter = editor.getPageCenter(editor.getShape(ids.frame1)!)!
		const boxPageCenter = editor.getPageCenter(editor.getShape(boxId)!)!

		expect(approximately(framePageCenter.x, boxPageCenter.x)).toBe(true)
		expect(approximately(framePageCenter.y, boxPageCenter.y)).toBe(true)
	})

	it('Reparents pasted shapes into a frame at the viewport center when nothing is selected', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		// Create a frame centered in the viewport
		const viewportCenter = editor.getViewportPageBounds().center
		const frameW = 400
		const frameH = 400
		editor.createShapes([
			{
				id: ids.frame1,
				type: 'frame',
				x: viewportCenter.x - frameW / 2,
				y: viewportCenter.y - frameH / 2,
				props: { w: frameW, h: frameH },
			},
		])

		// Create a small shape outside the frame, copy it, then delete it
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: -500,
				y: -500,
				props: { w: 10, h: 10 },
			},
		])
		editor.select(ids.box1).copy()
		editor.deleteShapes([ids.box1])
		editor.selectNone()

		// Paste with nothing selected — should land in viewport center, inside the frame
		editor.paste()

		const pastedShape = editor
			.getCurrentPageShapes()
			.find((s) => s.type === 'geo' && s.id !== ids.box1)!
		expect(pastedShape.parentId).toBe(ids.frame1)
	})

	it('Does not reparent pasted shapes when they land outside any frame', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		// Create a frame far from the viewport center
		editor.createShapes([
			{
				id: ids.frame1,
				type: 'frame',
				x: 5000,
				y: 5000,
				props: { w: 100, h: 100 },
			},
		])

		// Create a small shape, copy it, then delete it
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: -500,
				y: -500,
				props: { w: 10, h: 10 },
			},
		])
		editor.select(ids.box1).copy()
		editor.deleteShapes([ids.box1])
		editor.selectNone()

		// Paste — should land at viewport center, which is NOT inside the frame
		editor.paste()

		const pastedShape = editor
			.getCurrentPageShapes()
			.find((s) => s.type === 'geo' && s.id !== ids.box1)!
		expect(pastedShape.parentId).toBe(editor.getCurrentPageId())
	})

	it('Reparents pasted shapes into a frame when preservePosition places them inside it', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		// Create a frame at the origin
		editor.createShapes([
			{
				id: ids.frame1,
				type: 'frame',
				x: 0,
				y: 0,
				props: { w: 400, h: 400 },
			},
		])

		// Create a small shape inside the frame bounds, copy it, then delete it
		editor.createShapes([
			{
				id: ids.box1,
				type: 'geo',
				x: 150,
				y: 150,
				props: { w: 10, h: 10 },
			},
		])
		editor.select(ids.box1).copy()
		editor.deleteShapes([ids.box1])
		editor.selectNone()

		// Set camera so that the original position is in the viewport
		editor.setCamera({ x: 0, y: 0, z: 1 })

		// Paste with preservePosition — shape should land at original position, inside the frame
		editor.putContentOntoCurrentPage(editor.getClipboard()!, {
			preservePosition: true,
			select: true,
		})

		const [pastedId] = editor.getSelectedShapeIds()
		expect(editor.getShape(pastedId)?.parentId).toBe(ids.frame1)
	})

	it('Kicks out pasted shapes that do not overlap with the paste-parent frame', () => {
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		// Create three 100x100 rectangles spaced 200px apart (200px gap between edges)
		// rect1: x=0..100, rect2: x=300..400, rect3: x=600..700
		// All at y=0, so selection bounds = 700x100, center = (350, 50)
		editor.createShapes([
			{ id: ids.box1, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.box2, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.box3, type: 'geo', x: 600, y: 0, props: { w: 100, h: 100 } },
		])

		editor.select(ids.box1, ids.box2, ids.box3)
		editor.copy()

		// Delete the originals and create a 150x150 frame centered in the viewport
		editor.deleteShapes([ids.box1, ids.box2, ids.box3])
		const viewportCenter = editor.getViewportPageBounds().center
		editor.createShapes([
			{
				id: ids.frame1,
				type: 'frame',
				x: viewportCenter.x - 75,
				y: viewportCenter.y - 75,
				props: { w: 150, h: 150 },
			},
		])

		// Select the frame and paste
		editor.select(ids.frame1)
		editor.paste()

		// Find the three pasted geo shapes (the new ones, not the originals which were deleted)
		const pastedGeos = editor
			.getCurrentPageShapes()
			.filter((s) => s.type === 'geo')
			.sort((a, b) => {
				const aBounds = editor.getShapePageBounds(a)!
				const bBounds = editor.getShapePageBounds(b)!
				return aBounds.x - bBounds.x
			})

		expect(pastedGeos).toHaveLength(3)

		const [left, middle, right] = pastedGeos

		// The middle shape's center lands at the frame center → stays as child of the frame
		expect(middle.parentId).toBe(ids.frame1)

		// The left and right shapes are far outside the frame → kicked out to page
		expect(left.parentId).toBe(editor.getCurrentPageId())
		expect(right.parentId).toBe(editor.getCurrentPageId())
	})
})

describe('When pasting content with unsupported shape types...', () => {
	// Content copied from another tldraw app can carry custom shapes and bindings that this
	// editor has no util for. See https://github.com/tldraw/tldraw/issues/10127

	/** Copies the given shapes, then relabels some of them as types we have no util for. */
	function contentWithUnsupported(ids: TLShapeId[], unsupported: Map<TLShapeId, string>) {
		const content = structuredClone(editor.getContentFromCurrentPage(ids)!)
		for (const shape of content.shapes) {
			const type = unsupported.get(shape.id)
			if (type) (shape as { type: string }).type = type
		}
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
		return content
	}

	beforeEach(() => {
		// clear the page
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
	})

	it('drops the unsupported shapes and pastes the rest', () => {
		const known = createShapeId('known')
		const unknown = createShapeId('unknown')
		editor.createShapes([
			{ id: known, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: unknown, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
		])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported([known, unknown], new Map([[unknown, 'animation-camera']])),
			{ preserveIds: true, preservePosition: true }
		)

		expect(editor.getCurrentPageShapes().map((s) => s.id)).toEqual([known])
	})

	it('does not crash when every shape is unsupported', () => {
		const id = createShapeId('unknown')
		editor.createShapes([{ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported([id], new Map([[id, 'animation-camera']]))
		)

		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('lifts children of a dropped shape, keeping them where they were', () => {
		const unknown = createShapeId('unknown')
		const child = createShapeId('child')
		editor.createShapes([
			{ id: unknown, type: 'frame', x: 100, y: 200, props: { w: 300, h: 300 } },
			{ id: child, type: 'geo', x: 10, y: 20, parentId: unknown, props: { w: 50, h: 50 } },
		])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported([unknown], new Map([[unknown, 'animation-camera']])),
			{ preserveIds: true, preservePosition: true }
		)

		const pasted = editor.getShape(child)!
		expect(pasted.parentId).toBe(editor.getCurrentPageId())
		// the dropped parent's offset is baked into the child
		expect({ x: pasted.x, y: pasted.y }).toEqual({ x: 110, y: 220 })
	})

	it('lifts children into the nearest surviving ancestor, not all the way to the page', () => {
		const frame = createShapeId('frame')
		const unknown = createShapeId('unknown')
		const child = createShapeId('child')
		editor.createShapes([
			{ id: frame, type: 'frame', x: 0, y: 0, props: { w: 500, h: 500 } },
			{ id: unknown, type: 'frame', x: 100, y: 100, parentId: frame, props: { w: 200, h: 200 } },
			{ id: child, type: 'geo', x: 10, y: 20, parentId: unknown, props: { w: 50, h: 50 } },
		])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported([frame], new Map([[unknown, 'animation-camera']])),
			{ preserveIds: true, preservePosition: true }
		)

		const pasted = editor.getShape(child)!
		expect(pasted.parentId).toBe(frame)
		expect({ x: pasted.x, y: pasted.y }).toEqual({ x: 110, y: 120 })
	})

	it("bakes a dropped shape's rotation into its children", () => {
		const unknown = createShapeId('unknown')
		const child = createShapeId('child')
		editor.createShapes([
			{
				id: unknown,
				type: 'frame',
				x: 100,
				y: 0,
				rotation: Math.PI / 2,
				props: { w: 300, h: 300 },
			},
			{ id: child, type: 'geo', x: 10, y: 0, parentId: unknown, props: { w: 50, h: 50 } },
		])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported([unknown], new Map([[unknown, 'animation-camera']])),
			{ preserveIds: true, preservePosition: true }
		)

		const pasted = editor.getShape(child)!
		expect(pasted.x).toBeCloseTo(100)
		expect(pasted.y).toBeCloseTo(10)
		expect(pasted.rotation).toBeCloseTo(Math.PI / 2)
	})

	it('selects and positions a lifted child like any other pasted shape', () => {
		const unknown = createShapeId('unknown')
		const child = createShapeId('child')
		editor.createShapes([
			{ id: unknown, type: 'frame', x: 100, y: 200, props: { w: 300, h: 300 } },
			{ id: child, type: 'geo', x: 10, y: 20, parentId: unknown, props: { w: 50, h: 50 } },
		])
		const content = contentWithUnsupported([unknown], new Map([[unknown, 'animation-camera']]))

		// the default paste path, rather than the preserveIds/preservePosition one
		editor.putContentOntoCurrentPage(content, { select: true })

		const pasted = editor.getCurrentPageShapes()
		expect(pasted).toHaveLength(1)
		// the lifted child is a root shape now, so it gets selected with the rest of the paste
		expect(editor.getSelectedShapeIds()).toEqual([pasted[0].id])
		expect(pasted[0].parentId).toBe(editor.getCurrentPageId())
		// it overlaps the viewport at its lifted position, so the paste leaves it there
		expect({ x: pasted[0].x, y: pasted[0].y }).toEqual({ x: 110, y: 220 })
	})

	it('drops bindings that reference a dropped shape', () => {
		const unknown = createShapeId('unknown')
		const arrow = createShapeId('arrow')
		editor.createShapes([
			{ id: unknown, type: 'geo', x: 200, y: 0, props: { w: 100, h: 100 } },
			{ id: arrow, type: 'arrow', x: 0, y: 0 },
		])
		editor.createBindings([
			{
				type: 'arrow',
				fromId: arrow,
				toId: unknown,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
		])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported([arrow, unknown], new Map([[unknown, 'animation-camera']])),
			{ preserveIds: true, preservePosition: true }
		)

		expect(editor.getShape(arrow)).toBeDefined()
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toEqual([])
	})

	it('drops bindings whose own type has no util', () => {
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: b, type: 'geo', x: 100, y: 0, props: { w: 50, h: 50 } },
		])
		const content = structuredClone(editor.getContentFromCurrentPage([a, b])!)
		content.bindings = [
			{
				id: 'binding:custom' as TLBindingId,
				typeName: 'binding',
				type: 'made-up',
				fromId: a,
				toId: b,
				meta: {},
				props: {},
			} as unknown as TLBinding,
		]
		editor.selectAll().deleteShapes(editor.getSelectedShapeIds())

		editor.putContentOntoCurrentPage(content, { preserveIds: true, preservePosition: true })

		// both shapes paste, just unlinked
		expect(editor.getCurrentPageShapes()).toHaveLength(2)
	})

	it('emits an event so the UI can tell the user', () => {
		const handler = vi.fn()
		editor.addListener('unsupported-shapes', handler)
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: b, type: 'geo', x: 100, y: 0, props: { w: 50, h: 50 } },
		])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported(
				[a, b],
				new Map([
					[a, 'animation-camera'],
					[b, 'some-other-shape'],
				])
			)
		)

		expect(handler).toHaveBeenCalledTimes(1)
		const { types, shapeCount } = handler.mock.calls[0][0]
		expect([...types].sort()).toEqual(['animation-camera', 'some-other-shape'])
		expect(shapeCount).toBe(2)
	})

	it('counts shapes, not types', () => {
		const handler = vi.fn()
		editor.addListener('unsupported-shapes', handler)
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: b, type: 'geo', x: 100, y: 0, props: { w: 50, h: 50 } },
		])

		editor.putContentOntoCurrentPage(
			contentWithUnsupported(
				[a, b],
				new Map([
					[a, 'animation-camera'],
					[b, 'animation-camera'],
				])
			)
		)

		expect(handler).toHaveBeenCalledWith({ types: ['animation-camera'], shapeCount: 2 })
	})

	it('does not claim content was dropped when the paste never happened', () => {
		const handler = vi.fn()
		editor.addListener('unsupported-shapes', handler)
		editor.addListener('max-shapes', vi.fn())

		const known = createShapeId('known')
		const unknown = createShapeId('unknown')
		editor.createShapes([
			{ id: known, type: 'geo', x: 0, y: 0, props: { w: 50, h: 50 } },
			{ id: unknown, type: 'geo', x: 100, y: 0, props: { w: 50, h: 50 } },
		])
		const content = contentWithUnsupported([known, unknown], new Map([[unknown, 'geo-x']]))

		// a full page, so the paste bails on the max shapes check before creating anything
		vi.spyOn(editor, 'getCurrentPageShapeIds').mockReturnValue(
			new Set(
				Array.from({ length: editor.options.maxShapesPerPage }, (_, i) => createShapeId(`f${i}`))
			)
		)

		editor.putContentOntoCurrentPage(content)

		expect(editor.getCurrentPageShapes()).toEqual([])
		expect(handler).not.toHaveBeenCalled()
	})
})
