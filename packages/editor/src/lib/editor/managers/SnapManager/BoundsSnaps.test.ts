import { react } from '@tldraw/state'
import {
	PageRecordType,
	RecordProps,
	TLShape,
	TLShapeId,
	VecModel,
	createShapeId,
	vecModelValidator,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { Box, SelectionCorner, SelectionEdge } from '../../../primitives/Box'
import { Rectangle2d } from '../../../primitives/geometry/Rectangle2d'
import { Vec } from '../../../primitives/Vec'
import { TestEditor } from '../../../test/TestEditor'
import { ShapeUtil } from '../../shapes/ShapeUtil'

const SNAP_BOX = 'snap-box'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[SNAP_BOX]: { w: number; h: number; boundsSnapPoints: VecModel[] | null; canSnap: boolean }
	}
}

type SnapBoxShape = TLShape<typeof SNAP_BOX>

class SnapBoxUtil extends ShapeUtil<SnapBoxShape> {
	static override type = SNAP_BOX
	static override props: RecordProps<SnapBoxShape> = {
		w: T.number,
		h: T.number,
		boundsSnapPoints: T.arrayOf(vecModelValidator).nullable(),
		canSnap: T.boolean,
	}
	getDefaultProps(): SnapBoxShape['props'] {
		return { w: 100, h: 100, boundsSnapPoints: null, canSnap: true }
	}
	getGeometry(shape: SnapBoxShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override canSnap(shape: SnapBoxShape) {
		return shape.props.canSnap
	}
	override getBoundsSnapGeometry(shape: SnapBoxShape) {
		return { points: shape.props.boundsSnapPoints ?? undefined }
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

const round = (n: number) => Math.round(n * 1000) / 1000

// Flatten indicators into plain data so whole-object assertions don't trip over Vec's z field
// or the random indicator ids.
function getIndicatorSummary(editor: TestEditor) {
	return editor.snaps.getIndicators().map((indicator) => {
		if (indicator.type === 'points') {
			return {
				type: 'points',
				points: indicator.points.map((p) => [round(p.x), round(p.y)]),
			}
		}
		return {
			type: 'gaps',
			direction: indicator.direction,
			gaps: indicator.gaps.map((gap) => ({
				startEdge: gap.startEdge.map((p) => [round(p.x), round(p.y)]),
				endEdge: gap.endEdge.map((p) => [round(p.x), round(p.y)]),
			})),
		}
	})
}

let editor: TestEditor

function createBox(
	id: TLShapeId,
	x: number,
	y: number,
	w = 100,
	h = 100,
	extra: Partial<Omit<SnapBoxShape, 'props'>> & { props?: Partial<SnapBoxShape['props']> } = {}
) {
	const { props, ...rest } = extra
	editor.createShape<SnapBoxShape>({
		id,
		type: SNAP_BOX,
		x,
		y,
		...rest,
		props: { w, h, ...props },
	})
	return id
}

function snapTranslate(
	selectedId: TLShapeId,
	dragDelta: VecModel,
	lockedAxis: 'x' | 'y' | null = null
) {
	return editor.snaps.shapeBounds.snapTranslateShapes({
		lockedAxis,
		initialSelectionPageBounds: editor.getShapePageBounds(selectedId)!,
		initialSelectionSnapPoints: editor.snaps.shapeBounds.getSnapPoints(selectedId),
		dragDelta: Vec.From(dragDelta),
	})
}

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [SnapBoxUtil] })
})

afterEach(() => {
	editor.dispose()
})

describe('getSnapPoints', () => {
	it('returns the corners and center of the shape in page space', () => {
		const id = createBox(createShapeId('a'), 10, 20, 100, 50)

		expect(editor.snaps.shapeBounds.getSnapPoints(id)).toEqual([
			{ id: `${id}:0`, x: 10, y: 20 },
			{ id: `${id}:1`, x: 110, y: 20 },
			{ id: `${id}:2`, x: 110, y: 70 },
			{ id: `${id}:3`, x: 10, y: 70 },
			{ id: `${id}:4`, x: 60, y: 45 },
		])
	})

	it('transforms the points by the shape rotation', () => {
		const id = createBox(createShapeId('a'), 100, 100, 100, 100, { rotation: Math.PI / 2 })

		const points = editor.snaps.shapeBounds
			.getSnapPoints(id)
			.map((p) => ({ id: p.id, x: round(p.x), y: round(p.y) }))

		expect(points).toEqual([
			{ id: `${id}:0`, x: 100, y: 100 },
			{ id: `${id}:1`, x: 100, y: 200 },
			{ id: `${id}:2`, x: 0, y: 200 },
			{ id: `${id}:3`, x: 0, y: 100 },
			{ id: `${id}:4`, x: 50, y: 150 },
		])
	})

	it('includes the parent transform for nested shapes', () => {
		const parent = createBox(createShapeId('parent'), 100, 100, 400, 400)
		const child = createBox(createShapeId('child'), 10, 20, 50, 50, { parentId: parent })

		expect(editor.snaps.shapeBounds.getSnapPoints(child)).toEqual([
			{ id: `${child}:0`, x: 110, y: 120 },
			{ id: `${child}:1`, x: 160, y: 120 },
			{ id: `${child}:2`, x: 160, y: 170 },
			{ id: `${child}:3`, x: 110, y: 170 },
			{ id: `${child}:4`, x: 135, y: 145 },
		])
	})

	it('uses the custom bounds snap geometry when the util provides one', () => {
		const id = createBox(createShapeId('a'), 10, 20, 100, 100, {
			props: { boundsSnapPoints: [{ x: 50, y: 50 }] },
		})

		expect(editor.snaps.shapeBounds.getSnapPoints(id)).toEqual([{ id: `${id}:0`, x: 60, y: 70 }])
	})

	it('returns an empty array for an unknown shape', () => {
		expect(editor.snaps.shapeBounds.getSnapPoints(createShapeId('missing'))).toEqual([])
	})
})

describe('snappable shapes', () => {
	it('excludes the selected shapes, so a selection never snaps to itself', () => {
		const a = createBox(createShapeId('a'), 0, 0)
		const b = createBox(createShapeId('b'), 200, 0)
		editor.select(a)

		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([b]))

		editor.select(a, b)
		expect(editor.snaps.getSnappableShapes()).toEqual(new Set())
	})

	it('excludes shapes whose util says they cannot snap', () => {
		const a = createBox(createShapeId('a'), 0, 0)
		const b = createBox(createShapeId('b'), 200, 0, 100, 100, { props: { canSnap: false } })
		const c = createBox(createShapeId('c'), 400, 0)
		editor.select(a)

		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([c]))
		expect(editor.snaps.getSnappableShapes().has(b)).toBe(false)
	})

	it('excludes shapes outside of the viewport', () => {
		const a = createBox(createShapeId('a'), 0, 0)
		const inside = createBox(createShapeId('inside'), 200, 0)
		// the default viewport is 1080x720 at zoom 1
		const partlyInside = createBox(createShapeId('partly'), 1050, 0)
		const outside = createBox(createShapeId('outside'), 2000, 0)
		editor.select(a)

		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([inside, partlyInside]))
		expect(editor.snaps.getSnappableShapes().has(outside)).toBe(false)
	})

	it('excludes shapes on other pages', () => {
		const a = createBox(createShapeId('a'), 0, 0)
		const b = createBox(createShapeId('b'), 200, 0)
		const otherPageId = PageRecordType.createId('other')
		editor.createPage({ id: otherPageId, name: 'other' })
		createBox(createShapeId('c'), 200, 0, 100, 100, { parentId: otherPageId })
		editor.select(a)

		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([b]))
	})

	it('still includes locked shapes', () => {
		const a = createBox(createShapeId('a'), 0, 0)
		const locked = createBox(createShapeId('locked'), 200, 0, 100, 100, { isLocked: true })
		editor.select(a)

		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([locked]))
	})

	// Locks in current behaviour, see #10559.
	it('still includes shapes hidden via getShapeVisibility', () => {
		editor.dispose()
		editor = new TestEditor({
			shapeUtils: [SnapBoxUtil],
			getShapeVisibility: (shape) => (shape.meta.hidden ? 'hidden' : 'inherit'),
		})
		const a = createBox(createShapeId('a'), 0, 0)
		const hidden = createBox(createShapeId('hidden'), 200, 0, 100, 100, {
			meta: { hidden: true },
		})
		editor.select(a)

		expect(editor.isShapeHidden(hidden)).toBe(true)
		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([hidden]))
	})

	it('includes the children of a group but not the group itself', () => {
		const a = createBox(createShapeId('a'), 0, 0)
		const b = createBox(createShapeId('b'), 200, 0)
		const c = createBox(createShapeId('c'), 400, 0)
		const groupId = createShapeId('group')
		editor.groupShapes([b, c], { groupId, select: false })
		editor.select(a)

		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([b, c]))
	})

	it('only considers siblings within the common ancestor of the selection', () => {
		const parent = createBox(createShapeId('parent'), 0, 0, 600, 600)
		const child = createBox(createShapeId('child'), 10, 10, 50, 50, { parentId: parent })
		const sibling = createBox(createShapeId('sibling'), 200, 10, 50, 50, { parentId: parent })
		const cousin = createBox(createShapeId('cousin'), 700, 0, 50, 50)
		editor.select(child)

		// the parent is not frame-like, so it isn't a target either
		expect(editor.snaps.getSnappableShapes()).toEqual(new Set([sibling]))
		expect(editor.snaps.getSnappableShapes().has(cousin)).toBe(false)
	})
})

describe('snapTranslateShapes', () => {
	let a: TLShapeId
	let b: TLShapeId

	beforeEach(() => {
		a = createBox(createShapeId('a'), 0, 300)
		b = createBox(createShapeId('b'), 200, 0)
		editor.select(a)
	})

	it('snaps the right edge to the left edge of another shape within the threshold', () => {
		const { nudge } = snapTranslate(a, { x: 95, y: 0 })

		expect(nudge).toMatchObject({ x: 5, y: 0 })
		expect(getIndicatorSummary(editor)).toEqual([
			{
				type: 'points',
				points: [
					[200, 0],
					[200, 100],
					[200, 300],
					[200, 400],
				],
			},
		])
	})

	it('snaps when the offset is exactly the threshold', () => {
		const { nudge } = snapTranslate(a, { x: 92, y: 0 })
		expect(nudge).toMatchObject({ x: 8, y: 0 })
	})

	it('does not snap when the offset is outside the threshold', () => {
		const { nudge } = snapTranslate(a, { x: 91, y: 0 })

		expect(nudge).toMatchObject({ x: 0, y: 0 })
		expect(editor.snaps.getIndicators()).toEqual([])
	})

	it('scales the threshold with the zoom level', () => {
		editor.setCamera({ x: 0, y: 0, z: 2 })
		expect(editor.snaps.getSnapThreshold()).toBe(4)

		expect(snapTranslate(a, { x: 95, y: 0 }).nudge).toMatchObject({ x: 0, y: 0 })
		expect(snapTranslate(a, { x: 97, y: 0 }).nudge).toMatchObject({ x: 3, y: 0 })

		editor.setCamera({ x: 0, y: 0, z: 0.5 })
		expect(editor.snaps.getSnapThreshold()).toBe(16)
		expect(snapTranslate(a, { x: 85, y: 0 }).nudge).toMatchObject({ x: 15, y: 0 })
	})

	it('snaps the center to the center of another shape', () => {
		editor.updateShape<SnapBoxShape>({ id: b, type: SNAP_BOX, props: { w: 200 } })

		// a's center lands at 297, b's center is at 300; a's edges are nowhere near b's
		const { nudge } = snapTranslate(a, { x: 247, y: 0 })

		expect(nudge).toMatchObject({ x: 3, y: 0 })
		expect(getIndicatorSummary(editor)).toEqual([
			{
				type: 'points',
				points: [
					[300, 50],
					[300, 350],
				],
			},
		])
	})

	it('snaps in both axes at once', () => {
		// a's right edge lands at 195 (b's left is 200), a's top at 105 (b's bottom is 100)
		const { nudge } = snapTranslate(a, { x: 95, y: -195 })

		expect(nudge).toMatchObject({ x: 5, y: -5 })
		expect(getIndicatorSummary(editor)).toEqual([
			{
				type: 'points',
				points: [
					[200, 0],
					[200, 100],
					[200, 200],
				],
			},
			{
				type: 'points',
				points: [
					[300, 100],
					[200, 100],
					[100, 100],
				],
			},
		])
	})

	it('ignores the locked axis', () => {
		expect(snapTranslate(a, { x: 95, y: -195 }, 'x').nudge).toMatchObject({ x: 0, y: -5 })
		expect(snapTranslate(a, { x: 95, y: -195 }, 'y').nudge).toMatchObject({ x: 5, y: 0 })
	})

	it('prefers the closest snap when several are within the threshold', () => {
		createBox(createShapeId('c'), 148, 300)
		editor.select(a)

		// a's right edge lands at 195: 5 from b's left edge (200) and 3 from c's center (198)
		const { nudge } = snapTranslate(a, { x: 95, y: 0 })

		expect(nudge).toMatchObject({ x: 3, y: 0 })
	})

	it('does not snap to a selected shape', () => {
		editor.select(a, b)
		const selectionBounds = editor.getSelectionPageBounds()!

		const { nudge } = editor.snaps.shapeBounds.snapTranslateShapes({
			lockedAxis: null,
			initialSelectionPageBounds: selectionBounds,
			initialSelectionSnapPoints: selectionBounds.cornersAndCenter.map((p, i) => ({
				id: `selection:${i}`,
				x: p.x,
				y: p.y,
			})),
			dragDelta: new Vec(5, 5),
		})

		expect(nudge).toMatchObject({ x: 0, y: 0 })
		expect(editor.snaps.getIndicators()).toEqual([])
	})

	it('does not snap to shapes that cannot snap', () => {
		editor.updateShape<SnapBoxShape>({ id: b, type: SNAP_BOX, props: { canSnap: false } })

		expect(snapTranslate(a, { x: 95, y: 0 }).nudge).toMatchObject({ x: 0, y: 0 })
	})

	it('only snaps to the custom bounds snap points of other shapes', () => {
		editor.updateShape<SnapBoxShape>({
			id: b,
			type: SNAP_BOX,
			props: { boundsSnapPoints: [{ x: 50, y: 50 }] },
		})

		// the edge of b is no longer a target
		expect(snapTranslate(a, { x: 95, y: 0 }).nudge).toMatchObject({ x: 0, y: 0 })
		// but its center is: a's right edge lands at 245, b's center is 250
		expect(snapTranslate(a, { x: 145, y: 0 }).nudge).toMatchObject({ x: 5, y: 0 })
	})

	it('only snaps from the custom bounds snap points of the selection', () => {
		editor.updateShape<SnapBoxShape>({
			id: a,
			type: SNAP_BOX,
			props: { boundsSnapPoints: [{ x: 50, y: 50 }] },
		})

		expect(editor.snaps.shapeBounds.getSnapPoints(a)).toHaveLength(1)
		// a's right edge lands at 195, but only a's center is used for snapping
		expect(snapTranslate(a, { x: 95, y: 0 }).nudge).toMatchObject({ x: 0, y: 0 })
		// a's center lands at 195, b's left edge is 200
		expect(snapTranslate(a, { x: 145, y: 0 }).nudge).toMatchObject({ x: 5, y: 0 })
	})

	it('does nothing when there are no snap points in the selection', () => {
		editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, props: { boundsSnapPoints: [] } })

		expect(snapTranslate(a, { x: 95, y: 0 }).nudge).toMatchObject({ x: 0, y: 0 })
		expect(editor.snaps.getIndicators()).toEqual([])
	})

	it('replaces the previous indicators on every call', () => {
		snapTranslate(a, { x: 95, y: 0 })
		expect(editor.snaps.getIndicators()).toHaveLength(1)

		snapTranslate(a, { x: 50, y: 0 })
		expect(editor.snaps.getIndicators()).toHaveLength(0)

		snapTranslate(a, { x: 95, y: 0 })
		expect(editor.snaps.getIndicators()).toHaveLength(1)

		editor.snaps.clearIndicators()
		expect(editor.snaps.getIndicators()).toHaveLength(0)
	})
})

describe('gap snapping', () => {
	describe('horizontal gaps', () => {
		let a: TLShapeId

		beforeEach(() => {
			createBox(createShapeId('b'), 0, 0)
			createBox(createShapeId('c'), 200, 0)
			// a is narrower and shorter than the gap so its own edges never align with b or c
			a = createBox(createShapeId('a'), 600, 10, 50, 60)
			editor.select(a)
		})

		it('snaps the selection to the center of a gap between two shapes', () => {
			// a's center lands at 147; the gap between b and c is centered at 150
			const { nudge } = snapTranslate(a, { x: -478, y: 0 })

			expect(nudge).toMatchObject({ x: 3, y: 0 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'gaps',
					direction: 'horizontal',
					gaps: [
						{
							startEdge: [
								[100, 0],
								[100, 100],
							],
							endEdge: [
								[125, 10],
								[125, 70],
							],
						},
						{
							startEdge: [
								[175, 10],
								[175, 70],
							],
							endEdge: [
								[200, 0],
								[200, 100],
							],
						},
					],
				},
			])
		})

		it('does not center-snap a selection that is wider than the gap', () => {
			editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, props: { w: 130 } })

			// a's center lands at 147 again, with its edges well clear of b and c
			const { nudge } = snapTranslate(a, { x: -518, y: 0 })

			expect(nudge).toMatchObject({ x: 0, y: 0 })
			expect(editor.snaps.getIndicators()).toEqual([])
		})

		it('ignores gaps that the selection does not overlap vertically', () => {
			editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, y: 300 })

			const { nudge } = snapTranslate(a, { x: -478, y: 0 })

			expect(nudge).toMatchObject({ x: 0, y: 0 })
			expect(editor.snaps.getIndicators()).toEqual([])
		})

		it('snaps the selection to duplicate the gap on the right', () => {
			// a's left edge lands at 397; duplicating the gap puts it at 400
			const { nudge } = snapTranslate(a, { x: -203, y: 0 })

			expect(nudge).toMatchObject({ x: 3, y: 0 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'gaps',
					direction: 'horizontal',
					gaps: [
						{
							startEdge: [
								[100, 0],
								[100, 100],
							],
							endEdge: [
								[200, 0],
								[200, 100],
							],
						},
						{
							startEdge: [
								[300, 0],
								[300, 100],
							],
							endEdge: [
								[400, 10],
								[400, 70],
							],
						},
					],
				},
			])
		})

		it('snaps the selection to duplicate the gap on the left', () => {
			// a's right edge lands at -97; duplicating the gap puts it at -100
			const { nudge } = snapTranslate(a, { x: -747, y: 0 })

			expect(nudge).toMatchObject({ x: -3, y: 0 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'gaps',
					direction: 'horizontal',
					gaps: [
						{
							startEdge: [
								[-100, 10],
								[-100, 70],
							],
							endEdge: [
								[0, 0],
								[0, 100],
							],
						},
						{
							startEdge: [
								[100, 0],
								[100, 100],
							],
							endEdge: [
								[200, 0],
								[200, 100],
							],
						},
					],
				},
			])
		})

		it('extends the indicator across a run of equal gaps', () => {
			const d = createBox(createShapeId('d'), 400, 0)
			editor.select(a)

			// a's left edge lands at 597; duplicating the c-d gap puts it at 600
			const { nudge } = snapTranslate(a, { x: -3, y: 0 })

			expect(nudge).toMatchObject({ x: 3, y: 0 })
			expect(editor.getShapePageBounds(d)!.maxX).toBe(500)
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'gaps',
					direction: 'horizontal',
					gaps: [
						{
							startEdge: [
								[100, 0],
								[100, 100],
							],
							endEdge: [
								[200, 0],
								[200, 100],
							],
						},
						{
							startEdge: [
								[300, 0],
								[300, 100],
							],
							endEdge: [
								[400, 0],
								[400, 100],
							],
						},
						{
							startEdge: [
								[500, 0],
								[500, 100],
							],
							endEdge: [
								[600, 10],
								[600, 70],
							],
						},
					],
				},
			])
		})

		it('prefers a closer point snap over a gap snap', () => {
			createBox(createShapeId('d'), 120, 300, 60, 100)
			editor.select(a)

			// a's center lands at 147 (3 from the gap center) but a's left edge lands at 122,
			// only 2 from d's left edge
			const { nudge } = snapTranslate(a, { x: -478, y: 0 })

			expect(nudge).toMatchObject({ x: -2, y: 0 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'points',
					points: [
						[120, 300],
						[120, 400],
						[120, 10],
						[120, 70],
					],
				},
			])
		})
	})

	describe('vertical gaps', () => {
		let a: TLShapeId

		beforeEach(() => {
			createBox(createShapeId('b'), 0, 0)
			createBox(createShapeId('c'), 0, 200)
			a = createBox(createShapeId('a'), 10, 600, 60, 50)
			editor.select(a)
		})

		it('snaps the selection to the center of a gap between two shapes', () => {
			// a's center lands at 147; the gap between b and c is centered at 150
			const { nudge } = snapTranslate(a, { x: 0, y: -478 })

			expect(nudge).toMatchObject({ x: 0, y: 3 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'gaps',
					direction: 'vertical',
					gaps: [
						{
							startEdge: [
								[0, 100],
								[100, 100],
							],
							endEdge: [
								[10, 125],
								[70, 125],
							],
						},
						{
							startEdge: [
								[10, 175],
								[70, 175],
							],
							endEdge: [
								[0, 200],
								[100, 200],
							],
						},
					],
				},
			])
		})

		it('snaps the selection to duplicate the gap below', () => {
			// a's top edge lands at 397; duplicating the gap puts it at 400
			const { nudge } = snapTranslate(a, { x: 0, y: -203 })

			expect(nudge).toMatchObject({ x: 0, y: 3 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'gaps',
					direction: 'vertical',
					gaps: [
						{
							startEdge: [
								[0, 100],
								[100, 100],
							],
							endEdge: [
								[0, 200],
								[100, 200],
							],
						},
						{
							startEdge: [
								[0, 300],
								[100, 300],
							],
							endEdge: [
								[10, 400],
								[70, 400],
							],
						},
					],
				},
			])
		})

		it('snaps the selection to duplicate the gap above', () => {
			// a's bottom edge lands at -97; duplicating the gap puts it at -100
			const { nudge } = snapTranslate(a, { x: 0, y: -747 })

			expect(nudge).toMatchObject({ x: 0, y: -3 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'gaps',
					direction: 'vertical',
					gaps: [
						{
							startEdge: [
								[10, -100],
								[70, -100],
							],
							endEdge: [
								[0, 0],
								[100, 0],
							],
						},
						{
							startEdge: [
								[0, 100],
								[100, 100],
							],
							endEdge: [
								[0, 200],
								[100, 200],
							],
						},
					],
				},
			])
		})

		it('ignores gaps that the selection does not overlap horizontally', () => {
			editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, x: 300 })

			const { nudge } = snapTranslate(a, { x: 0, y: -478 })

			expect(nudge).toMatchObject({ x: 0, y: 0 })
			expect(editor.snaps.getIndicators()).toEqual([])
		})
	})
})

describe('snapResizeShapes', () => {
	let a: TLShapeId

	function snapResize(opts: {
		dragDelta: VecModel
		handle: SelectionCorner | SelectionEdge
		isAspectRatioLocked?: boolean
		isResizingFromCenter?: boolean
	}) {
		return editor.snaps.shapeBounds.snapResizeShapes({
			initialSelectionPageBounds: editor.getShapePageBounds(a)!,
			dragDelta: Vec.From(opts.dragDelta),
			handle: opts.handle,
			isAspectRatioLocked: opts.isAspectRatioLocked ?? false,
			isResizingFromCenter: opts.isResizingFromCenter ?? false,
		})
	}

	beforeEach(() => {
		a = createBox(createShapeId('a'), 0, 0)
		createBox(createShapeId('b'), 200, 300)
		editor.select(a)
	})

	it('snaps a corner handle to the edge of another shape', () => {
		// the bottom right corner lands at (195, 100); b's left edge is at 200
		const { nudge } = snapResize({ dragDelta: { x: 95, y: 0 }, handle: 'bottom_right' })

		expect(nudge).toMatchObject({ x: 5, y: 0 })
		expect(getIndicatorSummary(editor)).toEqual([
			{
				type: 'points',
				points: [
					[200, 300],
					[200, 400],
					[200, 0],
					[200, 100],
				],
			},
		])
	})

	it('does not snap outside the threshold', () => {
		const { nudge } = snapResize({ dragDelta: { x: 91, y: 0 }, handle: 'bottom_right' })

		expect(nudge).toMatchObject({ x: 0, y: 0 })
		expect(editor.snaps.getIndicators()).toEqual([])
	})

	it('only snaps the corners that the handle moves', () => {
		editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, x: 300, y: 100 })
		// c's left edge is 3 from the bottom right corner, which a top left drag does not move
		createBox(createShapeId('c'), 403, 500)
		editor.select(a)

		// the top left corner lands at (195, 95), 5 from b's left edge
		const { nudge } = snapResize({ dragDelta: { x: -105, y: -5 }, handle: 'top_left' })

		expect(nudge).toMatchObject({ x: 5, y: 0 })
	})

	it('locks the y axis when dragging a left or right edge', () => {
		editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, y: 205 })

		// the right edge lands at 195 (b's left is 200) and a's top is at 205 (b's top is 300)
		// so only the x axis can snap
		const { nudge } = snapResize({ dragDelta: { x: 95, y: 50 }, handle: 'right' })

		expect(nudge).toMatchObject({ x: 5, y: 0 })
		expect(getIndicatorSummary(editor)).toEqual([
			{
				type: 'points',
				points: [
					[200, 300],
					[200, 400],
					[200, 205],
					[200, 305],
				],
			},
		])
	})

	it('locks the x axis when dragging a top or bottom edge', () => {
		editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, x: 195 })

		// the bottom edge lands at 295 (b's top is 300); the box's right edge is at 295 too,
		// 5 from b's left edge, but the x axis is locked for this handle
		const { nudge } = snapResize({ dragDelta: { x: 50, y: 195 }, handle: 'bottom' })

		expect(nudge).toMatchObject({ x: 0, y: 5 })
	})

	it('snaps a top edge upwards', () => {
		editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, x: 200, y: 500 })

		// the top edge lands at 405; b's bottom is 400
		const { nudge } = snapResize({ dragDelta: { x: 0, y: -95 }, handle: 'top' })

		expect(nudge).toMatchObject({ x: 0, y: -5 })
	})

	it('uses the flipped handle when the drag crosses the opposite edge', () => {
		editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, x: 300 })
		editor.updateShape<SnapBoxShape>({ id: createShapeId('b'), type: SNAP_BOX, x: 600 })
		createBox(createShapeId('c'), 145, 300)
		editor.select(a)

		// dragging the bottom right corner past the left edge flips the box to (250, 0, 50, 100)
		// so the bottom left corner is the moving one, 5 away from c's right edge at 245
		const { nudge } = snapResize({ dragDelta: { x: -150, y: 0 }, handle: 'bottom_right' })

		expect(nudge).toMatchObject({ x: -5, y: 0 })
	})

	it('resizes symmetrically when resizing from center', () => {
		createBox(createShapeId('c'), 150, 300)
		editor.select(a)

		// the delta is doubled and the box re-centered, so the right edge lands at 147.5
		const { nudge } = snapResize({
			dragDelta: { x: 47.5, y: 0 },
			handle: 'right',
			isResizingFromCenter: true,
		})

		expect(nudge).toMatchObject({ x: 2.5, y: 0 })
		expect(getIndicatorSummary(editor)).toEqual([
			{
				type: 'points',
				points: [
					[150, 300],
					[150, 400],
					[150, 0],
					[150, 100],
				],
			},
		])
	})

	describe('with aspect ratio locked', () => {
		it('makes the nudge diagonal for a bottom right corner', () => {
			// the box resizes to (0, 0, 195, 195); the corner is 5 from b's left edge
			const { nudge } = snapResize({
				dragDelta: { x: 95, y: 50 },
				handle: 'bottom_right',
				isAspectRatioLocked: true,
			})

			expect(nudge).toMatchObject({ x: 5, y: 5 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'points',
					points: [
						[200, 300],
						[200, 400],
						[200, 0],
						[200, 200],
					],
				},
			])
		})

		it('inverts the secondary axis for a top right corner', () => {
			// the box resizes to (0, -95, 195, 195); the corner is 5 from b's left edge
			const { nudge } = snapResize({
				dragDelta: { x: 95, y: -50 },
				handle: 'top_right',
				isAspectRatioLocked: true,
			})

			expect(nudge).toMatchObject({ x: 5, y: -5 })
		})

		it('inverts the secondary axis for a bottom left corner', () => {
			editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, x: 300 })

			// the box resizes to (205, 0, 195, 195); the corner is 5 from b's left edge at 200
			const { nudge } = snapResize({
				dragDelta: { x: -95, y: 50 },
				handle: 'bottom_left',
				isAspectRatioLocked: true,
			})

			expect(nudge).toMatchObject({ x: -5, y: 5 })
		})

		it('uses the closest axis when both axes snap', () => {
			editor.updateShape<SnapBoxShape>({ id: createShapeId('b'), type: SNAP_BOX, y: 198 })

			// the corner lands at (195, 195): 5 from b's left edge, 3 from b's top edge
			const { nudge } = snapResize({
				dragDelta: { x: 95, y: 50 },
				handle: 'bottom_right',
				isAspectRatioLocked: true,
			})

			expect(nudge).toMatchObject({ x: 3, y: 3 })
			expect(getIndicatorSummary(editor)).toEqual([
				{
					type: 'points',
					points: [
						[200, 198],
						[300, 198],
						[198, 198],
						[0, 198],
					],
				},
			])
		})

		it('applies the aspect ratio to the nudge for non-square shapes', () => {
			editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, props: { w: 200, h: 100 } })
			editor.updateShape<SnapBoxShape>({ id: createShapeId('b'), type: SNAP_BOX, x: 395 })

			// the box resizes to (0, 0, 390, 195); the corner is 5 from b's left edge at 395
			const { nudge } = snapResize({
				dragDelta: { x: 190, y: 50 },
				handle: 'bottom_right',
				isAspectRatioLocked: true,
			})

			expect(nudge).toMatchObject({ x: 5, y: 2.5 })
		})

		it('does not change an edge handle nudge', () => {
			editor.updateShape<SnapBoxShape>({ id: a, type: SNAP_BOX, y: 205 })

			const { nudge } = snapResize({
				dragDelta: { x: 95, y: 0 },
				handle: 'right',
				isAspectRatioLocked: true,
			})

			expect(nudge).toMatchObject({ x: 5, y: 0 })
		})
	})

	it('ignores shapes that cannot snap', () => {
		editor.updateShape<SnapBoxShape>({
			id: createShapeId('b'),
			type: SNAP_BOX,
			props: { canSnap: false },
		})

		const { nudge } = snapResize({ dragDelta: { x: 95, y: 0 }, handle: 'bottom_right' })

		expect(nudge).toMatchObject({ x: 0, y: 0 })
	})

	it('reports indicators without a nudge when already aligned', () => {
		const { nudge } = snapResize({ dragDelta: { x: 100, y: 0 }, handle: 'bottom_right' })

		expect(nudge).toMatchObject({ x: 0, y: 0 })
		expect(editor.snaps.getIndicators()).toHaveLength(1)
	})
})

describe('indicators', () => {
	it('starts empty and round-trips through setIndicators and clearIndicators', () => {
		expect(editor.snaps.getIndicators()).toEqual([])

		editor.snaps.setIndicators([{ id: 'x', type: 'points', points: [{ x: 1, y: 2 }] }])
		expect(editor.snaps.getIndicators()).toEqual([
			{ id: 'x', type: 'points', points: [{ x: 1, y: 2 }] },
		])

		editor.snaps.clearIndicators()
		expect(editor.snaps.getIndicators()).toEqual([])
	})

	it('getIndicators is reactive', () => {
		const seen: number[] = []
		const dispose = react('snap indicators', () => {
			seen.push(editor.snaps.getIndicators().length)
		})

		editor.snaps.setIndicators([{ id: 'x', type: 'points', points: [{ x: 1, y: 2 }] }])
		editor.snaps.clearIndicators()
		// clearing again is a no-op and must not notify
		editor.snaps.clearIndicators()

		expect(seen).toEqual([0, 1, 0])
		dispose()
	})

	it('snapping with nothing selected and no other shapes returns a zero nudge', () => {
		const { nudge } = editor.snaps.shapeBounds.snapTranslateShapes({
			lockedAxis: null,
			initialSelectionPageBounds: new Box(0, 0, 100, 100),
			initialSelectionSnapPoints: [],
			dragDelta: new Vec(3, 3),
		})

		expect(nudge).toMatchObject({ x: 0, y: 0 })
		expect(editor.snaps.getIndicators()).toEqual([])
	})
})
