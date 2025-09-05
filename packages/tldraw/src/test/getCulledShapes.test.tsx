import {
	BaseBoxShapeUtil,
	Box,
	RecordProps,
	T,
	TLBaseShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

// Custom uncullable shape type for testing canCull override
type UncullableShape = TLBaseShape<'uncullable', { w: number; h: number }>

class UncullableShapeUtil extends BaseBoxShapeUtil<UncullableShape> {
	static override type = 'uncullable' as const
	static override props: RecordProps<UncullableShape> = {
		w: T.number,
		h: T.number,
	}

	override canCull() {
		return false
	}

	override getDefaultProps(): UncullableShape['props'] {
		return {
			w: 100,
			h: 100,
		}
	}

	override component() {
		return <div>Uncullable shape</div>
	}

	override indicator() {
		return <div>Uncullable shape</div>
	}
}

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ shapeUtils: [UncullableShapeUtil] })
	editor.setScreenBounds({ x: 0, y: 0, w: 1800, h: 900 })
})

function createShapes() {
	return editor.createShapesFromJsx([
		<TL.geo ref="A" x={100} y={100} w={100} h={100} />,
		<TL.frame ref="B" x={200} y={200} w={300} h={300}>
			<TL.geo ref="C" x={200} y={200} w={50} h={50} />
			{/* this is outside of the frames clipping bounds, so it should never be rendered */}
			<TL.geo ref="D" x={1000} y={1000} w={50} h={50} />
		</TL.frame>,
	])
}

it('lists shapes in viewport', () => {
	const ids = createShapes()
	editor.selectNone()
	// D is outside of the viewport, so it's clipped
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.D]))

	// Move the camera 201 pixels to the right and 201 pixels down
	editor.pan({ x: -201, y: -201 })
	vi.advanceTimersByTime(500)

	// A is now outside of the viewport, like D
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.D]))

	editor.pan({ x: -900, y: -900 })
	vi.advanceTimersByTime(500)
	// Now all shapes are outside of the viewport, except for D (which is clipped)
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.B, ids.C]))

	editor.select(ids.B)
	// We don't cull selected shapes
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.C]))

	editor.selectNone()
	editor.setEditingShape(ids.C)
	// or shapes being edited
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A, ids.B]))
})

const shapeSize = 100
const numberOfShapes = 100

function getChangeOutsideBounds(viewportSize: number) {
	const changeDirection = Math.random() > 0.5 ? 1 : -1
	const maxChange = 1000
	const changeAmount = 1 + Math.random() * maxChange
	if (changeDirection === 1) {
		// We need to get past the viewport size and then add a bit more
		return viewportSize + changeAmount
	} else {
		// We also need to take the shape size into account
		return -changeAmount - shapeSize
	}
}

function getChangeInsideBounds(viewportSize: number) {
	// We can go from -shapeSize to viewportSize
	return -shapeSize + Math.random() * (viewportSize + shapeSize)
}

function createFuzzShape(viewport: Box) {
	const id = createShapeId()
	if (Math.random() > 0.5) {
		const positionChange = Math.random()
		// Should x, or y, or both go outside the bounds?
		const dimensionChange = positionChange < 0.33 ? 'x' : positionChange < 0.66 ? 'y' : 'both'
		const xOutsideBounds = dimensionChange === 'x' || dimensionChange === 'both'
		const yOutsideBounds = dimensionChange === 'y' || dimensionChange === 'both'

		// Create a shape outside the viewport
		editor.createShape({
			id,
			type: 'geo',
			x:
				viewport.x +
				(xOutsideBounds ? getChangeOutsideBounds(viewport.w) : getChangeInsideBounds(viewport.w)),
			y:
				viewport.y +
				(yOutsideBounds ? getChangeOutsideBounds(viewport.h) : getChangeInsideBounds(viewport.h)),
			props: { w: shapeSize, h: shapeSize },
		})
		return { isCulled: true, id }
	} else {
		// Create a shape inside the viewport
		editor.createShape({
			id,
			type: 'geo',
			x: viewport.x + getChangeInsideBounds(viewport.w),
			y: viewport.y + getChangeInsideBounds(viewport.h),
			props: { w: shapeSize, h: shapeSize },
		})
		return { isCulled: false, id }
	}
}

it('correctly calculates the culled shapes when adding and deleting shapes', () => {
	const viewport = editor.getViewportPageBounds()
	const shapes: Array<TLShapeId | undefined> = []
	for (let i = 0; i < numberOfShapes; i++) {
		const { isCulled, id } = createFuzzShape(viewport)
		shapes.push(id)
		if (isCulled) {
			expect(editor.getCulledShapes()).toContain(id)
		} else {
			expect(editor.getCulledShapes()).not.toContain(id)
		}
	}
	const numberOfShapesToDelete = Math.floor((Math.random() * numberOfShapes) / 2)
	for (let i = 0; i < numberOfShapesToDelete; i++) {
		const index = Math.floor(Math.random() * (shapes.length - 1))
		const id = shapes[index]
		if (id) {
			editor.deleteShape(id)
			shapes[index] = undefined
			expect(editor.getCulledShapes()).not.toContain(id)
		}
	}

	const culledShapesIncremental = editor.getCulledShapes()

	// force full refresh
	editor.pan({ x: -1, y: 0 })
	editor.pan({ x: 1, y: 0 })

	const culledShapeFromScratch = editor.getCulledShapes()
	expect(culledShapesIncremental).toEqual(culledShapeFromScratch)
})

it('works for shapes that are outside of the viewport, but are then moved inside it', () => {
	const box1Id = createShapeId()
	const box2Id = createShapeId()
	const arrowId = createShapeId()

	editor
		.createShapes([
			{
				id: box1Id,
				props: { w: 100, h: 100, geo: 'rectangle' },
				type: 'geo',
				x: -500,
				y: 0,
			},
			{
				id: box2Id,
				type: 'geo',
				x: -1000,
				y: 200,
				props: { w: 100, h: 100, geo: 'rectangle' },
			},
			{
				id: arrowId,
				type: 'arrow',
				props: {
					start: { x: 0, y: 0 },
					end: { x: 0, y: 0 },
				},
			},
		])
		.createBindings([
			{
				type: 'arrow',
				fromId: arrowId,
				toId: box1Id,
				props: {
					terminal: 'start',
					isExact: true,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
			{
				type: 'arrow',
				fromId: arrowId,
				toId: box2Id,
				props: {
					terminal: 'end',
					isExact: true,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
				},
			},
		])

	expect(editor.getCulledShapes()).toEqual(new Set([box1Id, box2Id, arrowId]))

	// Move box1 and box2 inside the viewport
	editor.updateShapes([
		{ id: box1Id, type: 'geo', x: 100 },
		{ id: box2Id, type: 'geo', x: 200 },
	])
	// Arrow should also not be culled
	expect(editor.getCulledShapes()).toEqual(new Set())
})

it('respects canCull override - shapes that cannot be culled are never culled', () => {
	const cullableShapeId = createShapeId()
	const uncullableShapeId = createShapeId()

	// Create both shapes outside the viewport
	editor.createShapes([
		{
			id: cullableShapeId,
			type: 'geo',
			x: -2000, // Way outside viewport
			y: -2000,
			props: { w: 100, h: 100 },
		},
		{
			id: uncullableShapeId,
			type: 'uncullable',
			x: -2000, // Way outside viewport
			y: -2000,
			props: { w: 100, h: 100 },
		},
	])

	const culledShapes = editor.getCulledShapes()

	// The regular geo shape should be culled since it's outside the viewport
	expect(culledShapes).toContain(cullableShapeId)

	// The uncullable shape should NOT be culled even though it's outside the viewport
	expect(culledShapes).not.toContain(uncullableShapeId)
})
