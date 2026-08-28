import {
	Box,
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(opts: Parameters<typeof createHeadlessEditor>[0] = {}) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...opts })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

function makeRects(editor: Editor, rects: [number, number, number, number][]): TLShapeId[] {
	const ids = rects.map((_, i) => createShapeId(`rect${i}`))
	editor.createShapes<TLGeoShape>(
		rects.map(([x, y, w, h], i) => ({ id: ids[i], type: 'geo', x, y, props: { w, h } }))
	)
	return ids
}

function boundsOf(editor: Editor, ids: TLShapeId[]): Box[] {
	return ids.map((id) => editor.getShapePageBounds(id)!)
}

describe('alignShapes', () => {
	// A(0,0,100,50) B(200,100,50,100) C(400,300,150,25); common bounds are (0,0)-(550,325)
	const rects: [number, number, number, number][] = [
		[0, 0, 100, 50],
		[200, 100, 50, 100],
		[400, 300, 150, 25],
	]

	it.each([
		['left', [0, 0, 0], 'x'],
		['right', [450, 500, 400], 'x'],
		['center-horizontal', [225, 250, 200], 'x'],
		['top', [0, 0, 0], 'y'],
		['bottom', [275, 225, 300], 'y'],
		['center-vertical', [137.5, 112.5, 150], 'y'],
	] as const)('aligns %s', (operation, expected, axis) => {
		const editor = makeEditor()
		const ids = makeRects(editor, rects)
		editor.alignShapes(ids, operation)
		expect(boundsOf(editor, ids).map((b) => b[axis])).toEqual(expected)
	})
})

describe('distributeShapes', () => {
	it('distributes horizontally by moving only the middle shapes', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[120, 0, 100, 100],
			[500, 0, 100, 100],
		])
		editor.distributeShapes(ids, 'horizontal')
		// outer shapes anchor the span; the free space (600 - 300) splits into equal 150 gaps
		expect(boundsOf(editor, ids).map((b) => b.x)).toEqual([0, 250, 500])
	})

	it('distributes vertically by moving only the middle shapes', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[0, 110, 100, 100],
			[0, 700, 100, 100],
		])
		editor.distributeShapes(ids, 'vertical')
		expect(boundsOf(editor, ids).map((b) => b.y)).toEqual([0, 350, 700])
	})
})

describe('stackShapes', () => {
	it('stacks horizontally with a fixed gap', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[300, 50, 50, 100],
			[700, 0, 200, 100],
		])
		editor.stackShapes(ids, 'horizontal', 10)
		expect(boundsOf(editor, ids).map((b) => b.x)).toEqual([0, 110, 170])
	})

	it('stacks vertically with a fixed gap', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[50, 400, 100, 50],
			[0, 900, 100, 200],
		])
		editor.stackShapes(ids, 'vertical', 25)
		expect(boundsOf(editor, ids).map((b) => b.y)).toEqual([0, 125, 200])
	})

	it('does nothing for two shapes with gap 0', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[500, 0, 100, 100],
		])
		// gap 0 means "infer the most common existing gap", which needs at least three
		// shapes — with two, stackShapes is silently a no-op
		editor.stackShapes(ids, 'horizontal', 0)
		expect(boundsOf(editor, ids).map((b) => b.x)).toEqual([0, 500])
	})

	it('gap 0 with three or more shapes applies the most common existing gap', () => {
		const editor = makeEditor()
		// gaps: 40, 40, 250 — the inferred gap is the most common one (40)
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[140, 0, 100, 100],
			[280, 0, 100, 100],
			[630, 0, 100, 100],
		])
		editor.stackShapes(ids, 'horizontal', 0)
		expect(boundsOf(editor, ids).map((b) => b.x)).toEqual([0, 140, 280, 420])
	})
})

describe('packShapes', () => {
	it('packs scattered shapes tightly around their center with the given gap', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[600, 0, 100, 100],
			[0, 600, 100, 100],
			[600, 600, 100, 100],
		])
		const before = Box.Common(boundsOf(editor, ids))
		editor.packShapes(ids, 16)
		const bounds = boundsOf(editor, ids)
		const after = Box.Common(bounds)

		expect(after.w).toBeLessThan(before.w)
		expect(after.h).toBeLessThan(before.h)
		// packing preserves the cluster's center
		expect(after.center.x).toBeCloseTo(before.center.x, 6)
		expect(after.center.y).toBeCloseTo(before.center.y, 6)
		// no two shapes overlap after packing
		for (let i = 0; i < bounds.length; i++) {
			for (let j = i + 1; j < bounds.length; j++) {
				expect(bounds[i].collides(bounds[j])).toBe(false)
			}
		}
	})
})

describe('flipShapes', () => {
	it('mirrors shape positions across the selection center horizontally', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[300, 0, 100, 100],
		])
		editor.flipShapes(ids, 'horizontal')
		expect(boundsOf(editor, ids)).toEqual([new Box(300, 0, 100, 100), new Box(0, 0, 100, 100)])
	})

	it('mirrors shape positions across the selection center vertically', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 40],
			[0, 200, 100, 100],
		])
		editor.flipShapes(ids, 'vertical')
		expect(boundsOf(editor, ids)).toEqual([new Box(0, 260, 100, 40), new Box(0, 0, 100, 100)])
	})
})

describe('stretchShapes', () => {
	it('stretches every shape to the full common width', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 50],
			[200, 100, 50, 100],
		])
		editor.stretchShapes(ids, 'horizontal')
		expect(boundsOf(editor, ids)).toEqual([new Box(0, 0, 250, 50), new Box(0, 100, 250, 100)])
	})

	it('stretches every shape to the full common height', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 50],
			[200, 100, 50, 100],
		])
		editor.stretchShapes(ids, 'vertical')
		expect(boundsOf(editor, ids)).toEqual([new Box(0, 0, 100, 200), new Box(200, 0, 50, 200)])
	})
})

describe('z-order', () => {
	function makeStack(editor: Editor) {
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[10, 10, 100, 100],
			[20, 20, 100, 100],
		])
		return ids
	}
	const sortedIds = (editor: Editor) => editor.getCurrentPageShapesSorted().map((s) => s.id)

	it('sorts shapes in creation order by default', () => {
		const editor = makeEditor()
		const [a, b, c] = makeStack(editor)
		expect(sortedIds(editor)).toEqual([a, b, c])
	})

	it('bringToFront and sendToBack move to the extremes', () => {
		const editor = makeEditor()
		const [a, b, c] = makeStack(editor)
		editor.bringToFront([a])
		expect(sortedIds(editor)).toEqual([b, c, a])
		editor.sendToBack([c])
		expect(sortedIds(editor)).toEqual([c, b, a])
	})

	it('bringForward and sendBackward move one step', () => {
		const editor = makeEditor()
		const [a, b, c] = makeStack(editor)
		editor.bringForward([a])
		expect(sortedIds(editor)).toEqual([b, a, c])
		editor.sendBackward([c])
		expect(sortedIds(editor)).toEqual([b, c, a])
	})

	it('multi-select bringForward and sendBackward with extreme members', () => {
		const editor = makeEditor()
		const [a, b, c, d, e] = makeRects(editor, [
			[0, 0, 100, 100],
			[10, 10, 100, 100],
			[20, 20, 100, 100],
			[30, 30, 100, 100],
			[40, 40, 100, 100],
		])

		// each moving shape hops over the next overlapping non-member above it
		editor.bringForward([a, c])
		expect(sortedIds(editor)).toEqual([b, a, d, c, e])

		// e is already top-most: it stays put and does not drag a to the front with it
		editor.bringForward([a, e])
		expect(sortedIds(editor)).toEqual([b, d, a, c, e])

		// b is already bottom-most: it stays put while c hops behind a
		editor.sendBackward([b, c])
		expect(sortedIds(editor)).toEqual([b, d, c, a, e])
	})

	it('z-order changes what getShapeAtPoint returns', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[0, 0, 100, 100],
		])
		editor.updateShapes<TLGeoShape>(
			ids.map((id) => ({ id, type: 'geo', props: { fill: 'solid' } }))
		)
		expect(editor.getShapeAtPoint({ x: 50, y: 50 })?.id).toBe(ids[1])
		editor.bringToFront([ids[0]])
		expect(editor.getShapeAtPoint({ x: 50, y: 50 })?.id).toBe(ids[0])
	})
})

describe('rotateShapesBy', () => {
	it('rotates a single shape around its page bounds center', () => {
		const editor = makeEditor()
		const [id] = makeRects(editor, [[0, 0, 100, 50]])
		editor.rotateShapesBy([id], Math.PI / 2)

		expect(editor.getShape(id)!.rotation).toBeCloseTo(Math.PI / 2, 9)
		const bounds = editor.getShapePageBounds(id)!
		expect(bounds.x).toBeCloseTo(25, 6)
		expect(bounds.y).toBeCloseTo(-25, 6)
		expect(bounds.w).toBeCloseTo(50, 6)
		expect(bounds.h).toBeCloseTo(100, 6)
	})

	it('rotates multiple shapes around their common bounds center', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[200, 0, 100, 100],
		])
		editor.rotateShapesBy(ids, Math.PI)

		const [a, b] = boundsOf(editor, ids)
		expect(a.x).toBeCloseTo(200, 6)
		expect(a.y).toBeCloseTo(0, 6)
		expect(b.x).toBeCloseTo(0, 6)
		expect(b.y).toBeCloseTo(0, 6)
		for (const id of ids) expect(editor.getShape(id)!.rotation).toBeCloseTo(Math.PI, 9)
	})
})

describe('resizeShape', () => {
	it('scales dimensions from an explicit scale origin', () => {
		const editor = makeEditor()
		const [id] = makeRects(editor, [[100, 100, 100, 50]])
		editor.resizeShape(id, { x: 2, y: 3 }, { scaleOrigin: { x: 100, y: 100 } })
		expect(editor.getShapePageBounds(id)).toEqual(new Box(100, 100, 200, 150))
	})

	it('scales around the shape center by default', () => {
		const editor = makeEditor()
		const [id] = makeRects(editor, [[100, 100, 100, 100]])
		editor.resizeShape(id, { x: 2, y: 2 })
		expect(editor.getShapePageBounds(id)).toEqual(new Box(50, 50, 200, 200))
	})
})

describe('resizeToBounds', () => {
	it('fits a mixed set into target bounds, preserving relative positions', () => {
		const editor = makeEditor()
		// common bounds are (0,0)-(200,200), so fitting into 500x500 scales everything by 2.5
		const ids = makeRects(editor, [
			[0, 0, 100, 50],
			[150, 100, 50, 100],
			[50, 150, 100, 50],
		])
		editor.resizeToBounds(ids, new Box(0, 0, 500, 500))

		const bounds = boundsOf(editor, ids)
		expect(Box.Common(bounds)).toEqual(new Box(0, 0, 500, 500))
		expect(bounds).toEqual([
			new Box(0, 0, 250, 125),
			new Box(375, 250, 125, 250),
			new Box(125, 375, 250, 125),
		])
	})
})

describe('nudgeShapes', () => {
	it('translates shapes by exact page offsets', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[200, 300, 100, 100],
		])
		editor.nudgeShapes(ids, { x: 10, y: -5 })
		expect(boundsOf(editor, ids)).toEqual([new Box(10, -5, 100, 100), new Box(210, 295, 100, 100)])
	})
})

describe('duplicateShapes', () => {
	it('duplicates with an offset and selects the copies', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[200, 0, 100, 100],
		])
		editor.select(...ids)
		editor.duplicateShapes(ids, { x: 20, y: 30 })

		const all = editor.getCurrentPageShapes()
		expect(all).toHaveLength(4)

		const copies = all.filter((s) => !ids.includes(s.id))
		expect(copies.map((s) => ({ x: s.x, y: s.y })).sort((p, q) => p.x - q.x)).toEqual([
			{ x: 20, y: 30 },
			{ x: 220, y: 30 },
		])
		expect(new Set(editor.getSelectedShapeIds())).toEqual(new Set(copies.map((s) => s.id)))
	})

	it('duplicates exactly in place when no offset is given', () => {
		const editor = makeEditor()
		const [id] = makeRects(editor, [[40, 50, 100, 100]])
		editor.duplicateShapes([id])
		const copy = editor.getCurrentPageShapes().find((s) => s.id !== id)!
		expect({ x: copy.x, y: copy.y }).toEqual({ x: 40, y: 50 })
		expect(copy.props).toEqual(editor.getShape(id)!.props)
	})

	function makeBoundPair(editor: Editor) {
		const [a, b] = makeRects(editor, [
			[0, 0, 100, 100],
			[300, 0, 100, 100],
		])
		const arrow = createShapeId('arrow')
		editor.createShape<TLArrowShape>({ id: arrow, type: 'arrow', x: 0, y: 0 })
		editor.createBindings([
			{ type: 'arrow', fromId: arrow, toId: a, props: { terminal: 'start' } },
			{ type: 'arrow', fromId: arrow, toId: b, props: { terminal: 'end' } },
		])
		return { a, b, arrow }
	}

	it('duplicating a fully bound set rebinds the copied arrow to the copied shapes', () => {
		const editor = makeEditor()
		const { a, b, arrow } = makeBoundPair(editor)

		editor.duplicateShapes([a, b, arrow], { x: 20, y: 0 })

		const originals = new Set([a, b, arrow])
		const copies = editor.getCurrentPageShapes().filter((s) => !originals.has(s.id))
		expect(copies).toHaveLength(3)
		const copyArrow = copies.find((s) => s.type === 'arrow')!
		const copyA = copies.find((s) => s.type === 'geo' && s.x === 20)!
		const copyB = copies.find((s) => s.type === 'geo' && s.x === 320)!

		const copyBindings = editor.getBindingsFromShape<TLArrowBinding>(copyArrow.id, 'arrow')
		expect(copyBindings).toHaveLength(2)
		expect(copyBindings.find((binding) => binding.props.terminal === 'start')!.toId).toBe(copyA.id)
		expect(copyBindings.find((binding) => binding.props.terminal === 'end')!.toId).toBe(copyB.id)

		// the originals' bindings are untouched
		const originalBindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
		expect(originalBindings.find((binding) => binding.props.terminal === 'start')!.toId).toBe(a)
		expect(originalBindings.find((binding) => binding.props.terminal === 'end')!.toId).toBe(b)
	})

	it('duplicating a bound arrow alone drops the copied bindings but keeps its position', () => {
		const editor = makeEditor()
		const { arrow } = makeBoundPair(editor)
		const boundsBefore = editor.getShapePageBounds(arrow)!

		editor.duplicateShapes([arrow])

		const copyArrow = editor
			.getCurrentPageShapes()
			.find((s) => s.type === 'arrow' && s.id !== arrow)!
		// duplicateShapes isolates the copied set: bindings whose other end is outside the set
		// are not copied, so the copy is unbound — but the isolation step freezes the copy's
		// terminals at their bound positions, so it lands exactly on top of the original
		expect(editor.getBindingsInvolvingShape(copyArrow.id)).toHaveLength(0)
		expect(editor.getShapePageBounds(copyArrow.id)).toEqual(boundsBefore)
		// the original keeps both of its bindings
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(2)
	})
})

describe('groupShapes', () => {
	it('reparents members into a group whose bounds are their union', () => {
		const editor = makeEditor()
		const ids = makeRects(editor, [
			[0, 0, 100, 100],
			[300, 200, 100, 100],
		])
		editor.groupShapes(ids)

		const groupId = editor.getShape(ids[0])!.parentId as TLShapeId
		expect(editor.getShape(groupId)!.type).toBe('group')
		expect(editor.getShape(ids[1])!.parentId).toBe(groupId)
		expect(editor.getShapePageBounds(groupId)).toEqual(new Box(0, 0, 400, 300))
		// grouping does not move the members
		expect(boundsOf(editor, ids)).toEqual([new Box(0, 0, 100, 100), new Box(300, 200, 100, 100)])
	})
})
