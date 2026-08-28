import {
	Editor,
	PageRecordType,
	TLArrowBinding,
	TLArrowShape,
	TLFrameShape,
	TLGeoShape,
	TLParentId,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(...args: Parameters<typeof createHeadlessEditor>) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...args[0] })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

function makeFrame(editor: Editor, x: number, y: number, w = 200, h = 200) {
	const id = createShapeId()
	editor.createShape<TLFrameShape>({ id, type: 'frame', x, y, props: { w, h } })
	return id
}

function makeBox(
	editor: Editor,
	x: number,
	y: number,
	opts: { w?: number; h?: number; parentId?: TLParentId } = {}
) {
	const id = createShapeId()
	editor.createShape<TLGeoShape>({
		id,
		type: 'geo',
		x,
		y,
		parentId: opts.parentId,
		props: { w: opts.w ?? 100, h: opts.h ?? 100 },
	})
	return id
}

function makeBoundArrow(editor: Editor, a: TLShapeId, b: TLShapeId) {
	const arrow = createShapeId()
	editor.createShape<TLArrowShape>({ id: arrow, type: 'arrow', x: 0, y: 0 })
	editor.createBindings([
		{ type: 'arrow', fromId: arrow, toId: a, props: { terminal: 'start' } },
		{ type: 'arrow', fromId: arrow, toId: b, props: { terminal: 'end' } },
	])
	return arrow
}

describe('frames', () => {
	it('stores child coordinates in parent space while page bounds are page space', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 100, 100)
		const child = makeBox(editor, 10, 20, { parentId: frame, w: 50, h: 50 })

		expect(editor.getShape(child)).toMatchObject({ parentId: frame, x: 10, y: 20 })
		expect(editor.getShapePageBounds(child)).toMatchObject({ x: 110, y: 120, w: 50, h: 50 })
	})

	it('auto-parents a positioned shape created over a frame, converting x/y to frame space', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 100, 100)

		// createShape without a parentId treats x/y as page space, finds the frame under that
		// point, and rewrites the record into the frame's space — same as in the browser.
		const child = makeBox(editor, 150, 160, { w: 20, h: 20 })
		expect(editor.getShape(child)).toMatchObject({ parentId: frame, x: 50, y: 60 })
		expect(editor.getShapePageBounds(child)).toMatchObject({ x: 150, y: 160 })
	})

	it('does not auto-parent a shape created outside the frame', () => {
		const editor = makeEditor()
		makeFrame(editor, 100, 100)
		const outside = makeBox(editor, 500, 500)
		expect(editor.getShape(outside)!.parentId).toBe(editor.getCurrentPageId())
	})

	it('an explicit parentId wins over the point-based auto-parenting', () => {
		const editor = makeEditor()
		makeFrame(editor, 100, 100)
		const child = makeBox(editor, 150, 150, { parentId: editor.getCurrentPageId() })
		expect(editor.getShape(child)!.parentId).toBe(editor.getCurrentPageId())
		// with an explicit parent, x/y are taken as parent-space verbatim — no conversion
		expect(editor.getShape(child)).toMatchObject({ x: 150, y: 150 })
	})

	it('reparentShapes between frames preserves page position and rewrites local coords', () => {
		const editor = makeEditor()
		const frameA = makeFrame(editor, 0, 0)
		const frameB = makeFrame(editor, 1000, 1000)
		const child = makeBox(editor, 10, 10, { parentId: frameA, w: 50, h: 50 })

		const before = editor.getShapePageBounds(child)!
		editor.reparentShapes([child], frameB)

		expect(editor.getShape(child)).toMatchObject({ parentId: frameB, x: -990, y: -990 })
		expect(editor.getShapePageBounds(child)).toEqual(before)
	})

	it('reparentShapes to the page converts coords back to page space', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 100, 100)
		const child = makeBox(editor, 10, 10, { parentId: frame })

		editor.reparentShapes([child], editor.getCurrentPageId())
		expect(editor.getShape(child)).toMatchObject({
			parentId: editor.getCurrentPageId(),
			x: 110,
			y: 110,
		})
	})

	it('deleting a frame deletes its children', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 0, 0)
		const child = makeBox(editor, 10, 10, { parentId: frame })

		// children are deleted with the frame, not reparented — the reparenting "remove frame"
		// behavior is a UI action in the tldraw package, not part of deleteShapes
		editor.deleteShape(frame)
		expect(editor.getShape(frame)).toBeUndefined()
		expect(editor.getShape(child)).toBeUndefined()
	})

	it('clips children via getShapeMask but not via getShapePageBounds', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 0, 0, 200, 200)
		// child sticks 100px out of the frame's right edge
		const child = makeBox(editor, 150, 50, { parentId: frame, w: 200, h: 50 })

		// bounds are unclipped
		expect(editor.getShapePageBounds(child)).toMatchObject({ x: 150, y: 50, w: 200, h: 50 })
		// the mask is the frame's page-space rectangle
		expect(editor.getShapeMask(child)).toEqual([
			{ x: 0, y: 0, z: 1 },
			{ x: 200, y: 0, z: 1 },
			{ x: 200, y: 200, z: 1 },
			{ x: 0, y: 200, z: 1 },
		])
		// page children have no mask
		const pageShape = makeBox(editor, 500, 500)
		expect(editor.getShapeMask(pageShape)).toBeUndefined()
	})

	it('getShapeAtPoint misses the clipped part of a frame child', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 0, 0, 200, 200)
		const child = makeBox(editor, 150, 50, { parentId: frame, w: 200, h: 50 })

		expect(editor.getShapeAtPoint({ x: 175, y: 75 }, { hitInside: true })?.id).toBe(child)
		// the part of the child outside the frame is masked out of hit tests; the point misses
		// the frame too, so nothing is hit
		expect(editor.getShapeAtPoint({ x: 300, y: 75 }, { hitInside: true })).toBeUndefined()
	})
})

describe('groups', () => {
	function makeTwoBoxes(editor: Editor) {
		return [
			makeBox(editor, 0, 0, { w: 100, h: 100 }),
			makeBox(editor, 300, 200, { w: 100, h: 100 }),
		]
	}

	it('groupShapes creates a group at the common bounds and reparents children', () => {
		const editor = makeEditor()
		const [a, b] = makeTwoBoxes(editor)
		const groupId = createShapeId()
		editor.groupShapes([a, b], { groupId })

		const group = editor.getShape(groupId)!
		expect(group).toMatchObject({ type: 'group', x: 0, y: 0 })
		expect(editor.getShapePageBounds(groupId)).toMatchObject({ x: 0, y: 0, w: 400, h: 300 })
		expect(editor.getShape(a)!.parentId).toBe(groupId)
		expect(editor.getShape(b)!.parentId).toBe(groupId)
		// children keep their page position, now expressed in group space
		expect(editor.getShapePageBounds(b)).toMatchObject({ x: 300, y: 200 })
	})

	it('groupShapes selects the group by default and skips selection with select: false', () => {
		const editor = makeEditor()
		const [a, b] = makeTwoBoxes(editor)
		const groupId = createShapeId()
		editor.groupShapes([a, b], { groupId })
		expect(editor.getSelectedShapeIds()).toEqual([groupId])

		const [c, d] = makeTwoBoxes(editor)
		editor.selectNone()
		editor.groupShapes([c, d], { select: false })
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('moving a group moves its children in page space without touching their records', () => {
		const editor = makeEditor()
		const [a, b] = makeTwoBoxes(editor)
		const groupId = createShapeId()
		editor.groupShapes([a, b], { groupId })

		const aBefore = editor.getShape(a)!
		editor.updateShape({ id: groupId, type: 'group', x: 1000, y: 500 })

		expect(editor.getShape(a)).toMatchObject({ x: aBefore.x, y: aBefore.y })
		expect(editor.getShapePageBounds(a)).toMatchObject({ x: 1000, y: 500 })
		expect(editor.getShapePageBounds(b)).toMatchObject({ x: 1300, y: 700 })
	})

	it('select() on a grouped child selects the child directly — no promotion to the group', () => {
		const editor = makeEditor()
		const [a, b] = makeTwoBoxes(editor)
		editor.groupShapes([a, b])

		// promoting a click on a child to select its group is select-tool pointer behavior;
		// the programmatic API selects exactly what it is given
		editor.select(a)
		expect(editor.getSelectedShapeIds()).toEqual([a])
	})

	it('supports nested groups, with root-most ancestor first in getShapeAncestors', () => {
		const editor = makeEditor()
		const [a, b] = makeTwoBoxes(editor)
		const inner = createShapeId()
		editor.groupShapes([a, b], { groupId: inner })
		const c = makeBox(editor, 600, 600)
		const outer = createShapeId()
		editor.groupShapes([inner, c], { groupId: outer })

		expect(editor.getShape(inner)!.parentId).toBe(outer)
		expect(editor.getShapeAncestors(a).map((s) => s.id)).toEqual([outer, inner])
	})

	it('ungroupShapes deletes the group, reparents children, and preserves page positions', () => {
		const editor = makeEditor()
		const [a, b] = makeTwoBoxes(editor)
		const groupId = createShapeId()
		editor.groupShapes([a, b], { groupId })
		const aPageBounds = editor.getShapePageBounds(a)!

		editor.ungroupShapes([groupId])

		expect(editor.getShape(groupId)).toBeUndefined()
		expect(editor.getShape(a)!.parentId).toBe(editor.getCurrentPageId())
		expect(editor.getShapePageBounds(a)).toEqual(aPageBounds)
		// ungrouping selects the freed children by default
		expect(new Set(editor.getSelectedShapeIds())).toEqual(new Set([a, b]))
	})

	it('deleting a group deletes its children too', () => {
		const editor = makeEditor()
		const [a, b] = makeTwoBoxes(editor)
		const groupId = createShapeId()
		editor.groupShapes([a, b], { groupId })

		editor.deleteShape(groupId)
		expect(editor.getShape(a)).toBeUndefined()
		expect(editor.getShape(b)).toBeUndefined()
	})
})

describe('ancestry', () => {
	it('walks parents with getShapeParent, findShapeAncestor, and hasAncestor', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 0, 0)
		const child = makeBox(editor, 10, 10, { parentId: frame })

		expect(editor.getShapeParent(child)!.id).toBe(frame)
		expect(editor.getShapeParent(frame)).toBeUndefined()
		expect(editor.findShapeAncestor(child, (s) => s.type === 'frame')!.id).toBe(frame)
		expect(editor.findShapeAncestor(child, (s) => s.type === 'group')).toBeUndefined()
		expect(editor.hasAncestor(child, frame)).toBe(true)
		expect(editor.hasAncestor(frame, child)).toBe(false)
	})

	it('getSortedChildIdsForParent returns children in z-order', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 0, 0)
		const a = makeBox(editor, 10, 10, { parentId: frame })
		const b = makeBox(editor, 20, 20, { parentId: frame })
		expect(editor.getSortedChildIdsForParent(frame)).toEqual([a, b])

		editor.sendToBack([b])
		expect(editor.getSortedChildIdsForParent(frame)).toEqual([b, a])
	})

	it('findCommonAncestor finds the nearest shared parent, or undefined at the page', () => {
		const editor = makeEditor()
		const frame = makeFrame(editor, 0, 0)
		const a = makeBox(editor, 10, 10, { parentId: frame })
		const b = makeBox(editor, 20, 20, { parentId: frame })
		const loose = makeBox(editor, 500, 500)

		expect(editor.findCommonAncestor([a, b])).toBe(frame)
		// shapes whose only common ancestor is the page get undefined, not the page id
		expect(editor.findCommonAncestor([a, loose])).toBeUndefined()
	})
})

describe('pages', () => {
	it('createPage appends pages in getPages order', () => {
		const editor = makeEditor()
		const first = editor.getCurrentPageId()
		const p2 = PageRecordType.createId()
		const p3 = PageRecordType.createId()
		editor.createPage({ id: p2, name: 'two' })
		editor.createPage({ id: p3, name: 'three' })

		expect(editor.getPages().map((p) => p.id)).toEqual([first, p2, p3])
	})

	it('scopes shapes to their page', () => {
		const editor = makeEditor()
		const page1 = editor.getCurrentPageId()
		const onPage1 = makeBox(editor, 0, 0)

		const p2 = PageRecordType.createId()
		editor.createPage({ id: p2 })
		editor.setCurrentPage(p2)
		expect(editor.getCurrentPageShapeIds().size).toBe(0)
		const onPage2 = makeBox(editor, 0, 0)

		expect(editor.getPageShapeIds(page1)).toEqual(new Set([onPage1]))
		expect(editor.getPageShapeIds(p2)).toEqual(new Set([onPage2]))
		// getShape still resolves shapes on other pages
		editor.setCurrentPage(page1)
		expect(editor.getShape(onPage2)).toBeDefined()
	})

	it('moveShapesToPage preserves ids and positions, and switches the current page', () => {
		const editor = makeEditor()
		const page1 = editor.getCurrentPageId()
		const box = makeBox(editor, 40, 50)
		const p2 = PageRecordType.createId()
		editor.createPage({ id: p2 })

		editor.moveShapesToPage([box], p2)

		// moveShapesToPage navigates to the destination page as a side effect
		expect(editor.getCurrentPageId()).toBe(p2)
		expect(editor.getShape(box)).toMatchObject({ parentId: p2, x: 40, y: 50 })
		expect(editor.getPageShapeIds(page1).size).toBe(0)
	})

	it('drops the binding when only the bound target moves to another page', () => {
		const editor = makeEditor()
		const page1 = editor.getCurrentPageId()
		const a = makeBox(editor, 0, 0)
		const b = makeBox(editor, 300, 0)
		const arrow = makeBoundArrow(editor, a, b)
		const p2 = PageRecordType.createId()
		editor.createPage({ id: p2 })

		editor.moveShapesToPage([b], p2)

		// the move is implemented as delete + recreate, so the delete-side binding cleanup
		// runs: the arrow keeps only its binding to the shape that stayed behind
		expect(editor.getShape(b)!.parentId).toBe(p2)
		editor.setCurrentPage(page1)
		expect(editor.getShape(arrow)).toBeDefined()
		const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
		expect(bindings).toHaveLength(1)
		expect(bindings[0].toId).toBe(a)
	})

	it('keeps bindings when arrow and targets move to another page together', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 0, 0)
		const b = makeBox(editor, 300, 0)
		const arrow = makeBoundArrow(editor, a, b)
		const p2 = PageRecordType.createId()
		editor.createPage({ id: p2 })

		editor.moveShapesToPage([a, b, arrow], p2)

		expect(editor.getShape(arrow)!.parentId).toBe(p2)
		const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
		expect(new Set(bindings.map((binding) => binding.toId))).toEqual(new Set([a, b]))
	})

	it('deletePage refuses to delete the last page', () => {
		const editor = makeEditor()
		const page1 = editor.getCurrentPageId()
		editor.deletePage(page1)
		expect(editor.getPages()).toHaveLength(1)
		expect(editor.getCurrentPageId()).toBe(page1)
	})

	it('deleting the current page switches to a neighbor and deletes its shapes', () => {
		const editor = makeEditor()
		const page1 = editor.getCurrentPageId()
		const p2 = PageRecordType.createId()
		editor.createPage({ id: p2 })
		editor.setCurrentPage(p2)
		const box = makeBox(editor, 0, 0)

		editor.deletePage(p2)

		expect(editor.getCurrentPageId()).toBe(page1)
		expect(editor.getPage(p2)).toBeUndefined()
		expect(editor.getShape(box)).toBeUndefined()
	})

	it('deleting a non-current page leaves the current page alone', () => {
		const editor = makeEditor()
		const page1 = editor.getCurrentPageId()
		const p2 = PageRecordType.createId()
		editor.createPage({ id: p2 })

		editor.deletePage(p2)
		expect(editor.getCurrentPageId()).toBe(page1)
		expect(editor.getPages().map((p) => p.id)).toEqual([page1])
	})
})

describe('bindings', () => {
	it('a bound arrow follows its target when the target translates', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 0, 0)
		const b = makeBox(editor, 300, 0)
		const arrow = makeBoundArrow(editor, a, b)

		const before = editor.getShapePageBounds(arrow)!
		editor.updateShape({ id: b, type: 'geo', x: 600 })
		const after = editor.getShapePageBounds(arrow)!

		// the arrow record's own x/y do not change; its geometry recomputes from the binding
		expect(after.maxX - before.maxX).toBeCloseTo(300, 6)
		expect(editor.getShape(arrow)!.x).toBe(0)
	})

	it('removes only the affected binding when a terminal target is deleted', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 0, 0)
		const b = makeBox(editor, 300, 0)
		const arrow = makeBoundArrow(editor, a, b)

		editor.deleteShape(a)
		let bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
		expect(bindings).toHaveLength(1)
		expect(bindings[0].props.terminal).toBe('end')

		editor.deleteShape(b)
		bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
		expect(bindings).toHaveLength(0)
		expect(editor.getShape(arrow)).toBeDefined()
	})

	it('round-trips binding props and fills defaults for omitted ones', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 0, 0)
		const arrow = createShapeId()
		editor.createShape<TLArrowShape>({ id: arrow, type: 'arrow', x: 0, y: 0 })
		editor.createBindings([
			{
				type: 'arrow',
				fromId: arrow,
				toId: a,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.25, y: 0.75 },
					isPrecise: true,
					isExact: false,
				},
			},
		])

		const binding = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')[0]
		expect(binding.props).toEqual({
			terminal: 'end',
			normalizedAnchor: { x: 0.25, y: 0.75 },
			isPrecise: true,
			isExact: false,
			// omitted props come from ArrowBindingUtil.getDefaultProps
			snap: 'none',
		})

		editor.updateBinding({ ...binding, props: { ...binding.props, isPrecise: false } })
		expect((editor.getBinding(binding.id) as TLArrowBinding).props.isPrecise).toBe(false)
	})

	it('getBindingsInvolvingShape covers both directions; from/to filter by role', () => {
		const editor = makeEditor()
		const a = makeBox(editor, 0, 0)
		const b = makeBox(editor, 300, 0)
		const arrow = makeBoundArrow(editor, a, b)

		expect(editor.getBindingsInvolvingShape(arrow)).toHaveLength(2)
		expect(editor.getBindingsInvolvingShape(a)).toHaveLength(1)
		expect(editor.getBindingsInvolvingShape(a, 'arrow')).toHaveLength(1)

		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(2)
		expect(editor.getBindingsFromShape(a, 'arrow')).toHaveLength(0)
		expect(editor.getBindingsToShape(a, 'arrow')).toHaveLength(1)
		expect(editor.getBindingsToShape(arrow, 'arrow')).toHaveLength(0)
	})

	it('a precise binding stays anchored through target resize and rotation', () => {
		const editor = makeEditor()
		const target = makeBox(editor, 300, 100)
		const arrow = createShapeId()
		editor.createShape<TLArrowShape>({ id: arrow, type: 'arrow', x: 0, y: 0 })
		editor.createBindings([
			{
				type: 'arrow',
				fromId: arrow,
				toId: target,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.25, y: 0.75 },
					isPrecise: true,
					// exact so the rendered endpoint is the anchor itself rather than the
					// outline intersection, which makes the glue assertions exact
					isExact: true,
				},
			},
		])
		const bindingId = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')[0].id

		function anchorPagePoint() {
			const shape = editor.getShape<TLGeoShape>(target)!
			return editor
				.getShapePageTransform(target)
				.applyToPoint({ x: 0.25 * shape.props.w, y: 0.75 * shape.props.h })
		}
		function expectArrowEndGlued() {
			const bounds = editor.getShapePageBounds(arrow)!
			const anchor = anchorPagePoint()
			// the arrow starts at page (0,0), up and left of the target at every step, so the
			// glued endpoint is exactly the bounds' far corner
			expect(bounds.maxX).toBeCloseTo(anchor.x, 6)
			expect(bounds.maxY).toBeCloseTo(anchor.y, 6)
		}

		expectArrowEndGlued()

		editor.resizeShape(target, { x: 2, y: 2 })
		expectArrowEndGlued()

		editor.rotateShapesBy([target], Math.PI / 4)
		expectArrowEndGlued()

		// the binding itself never changes: the endpoint moves because the target's
		// transform does, not because the anchor is rewritten
		const binding = editor.getBinding(bindingId) as TLArrowBinding
		expect(binding.props.normalizedAnchor).toEqual({ x: 0.25, y: 0.75 })
	})
})

describe('locking', () => {
	it('toggleLock flips isLocked', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 0, 0)
		editor.toggleLock([id])
		expect(editor.getShape(id)!.isLocked).toBe(true)
		editor.toggleLock([id])
		expect(editor.getShape(id)!.isLocked).toBe(false)
	})

	it('deleteShapes skips locked shapes', () => {
		const editor = makeEditor()
		const locked = makeBox(editor, 0, 0)
		const unlocked = makeBox(editor, 200, 0)
		editor.toggleLock([locked])

		editor.deleteShapes([locked, unlocked])
		expect(editor.getShape(locked)).toBeDefined()
		expect(editor.getShape(unlocked)).toBeUndefined()
	})

	it('duplicateShapes skips locked shapes', () => {
		const editor = makeEditor()
		const locked = makeBox(editor, 0, 0)
		const unlocked = makeBox(editor, 200, 0)
		editor.toggleLock([locked])

		editor.duplicateShapes([locked, unlocked], { x: 10, y: 0 })
		const all = editor.getCurrentPageShapes()
		// only the unlocked shape was copied
		expect(all).toHaveLength(3)
		const copy = all.find((s) => s.id !== locked && s.id !== unlocked)!
		expect(copy).toMatchObject({ x: 210, y: 0 })

		// a set of only locked shapes is a complete no-op
		editor.duplicateShapes([locked], { x: 10, y: 0 })
		expect(editor.getCurrentPageShapes()).toHaveLength(3)
	})

	it('plain updateShape on a locked shape is silently dropped, except unlocking', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 0, 0)
		editor.toggleLock([id])

		editor.updateShape({ id, type: 'geo', x: 500 })
		expect(editor.getShape(id)!.x).toBe(0)

		// a partial that sets isLocked: false is let through whole, so the other fields in
		// the same partial apply too
		editor.updateShape({ id, type: 'geo', isLocked: false, x: 500 })
		expect(editor.getShape(id)).toMatchObject({ isLocked: false, x: 500 })
	})

	it('getShapeAtPoint ignores locked shapes unless hitLocked is set', () => {
		const editor = makeEditor()
		const id = makeBox(editor, 0, 0)
		editor.toggleLock([id])

		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true })).toBeUndefined()
		expect(editor.getShapeAtPoint({ x: 50, y: 50 }, { hitInside: true, hitLocked: true })?.id).toBe(
			id
		)
	})
})
