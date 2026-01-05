import {
	BaseBoxShapeUtil,
	Box,
	RecordProps,
	T,
	TLShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'
import { TL } from './test-jsx'

const UNCULLABLE_TYPE = 'uncullable'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[UNCULLABLE_TYPE]: { w: number; h: number }
	}
}

// Custom uncullable shape type for testing canCull override
type UncullableShape = TLShape<typeof UNCULLABLE_TYPE>

class UncullableShapeUtil extends BaseBoxShapeUtil<UncullableShape> {
	static override type = UNCULLABLE_TYPE
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

	// Move the camera far enough that shape A is outside culling bounds (viewport + cullingMargin)
	// Shape A is at (100,100) with size (100,100), so right edge at 200
	// Need to pan so viewport.x exceeds shape right edge + horizontal margin
	const viewportBounds = editor.getViewportScreenBounds()
	const cullingMargin = editor.options.cullingMargin
	const horizontalMargin = viewportBounds.w * cullingMargin
	const verticalMargin = viewportBounds.h * cullingMargin
	editor.pan({ x: -(200 + horizontalMargin + 100), y: -(200 + verticalMargin + 100) })
	vi.advanceTimersByTime(500)

	// A is now outside of the culling bounds, but D is within expanded bounds so not culled yet
	expect(editor.getCulledShapes()).toStrictEqual(new Set([ids.A]))

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

function getChangeOutsideBounds(viewportSize: number, marginRatio: number) {
	const changeDirection = Math.random() > 0.5 ? 1 : -1
	const maxChange = 1000
	const changeAmount = 1 + Math.random() * maxChange
	const cullingMargin = viewportSize * marginRatio
	if (changeDirection === 1) {
		// We need to get past the viewport size + culling margin and then add a bit more
		return viewportSize + cullingMargin + changeAmount
	} else {
		// We also need to take the shape size and culling margin into account
		return -cullingMargin - changeAmount - shapeSize
	}
}

function getChangeInsideBounds(viewportSize: number, marginRatio: number) {
	// With culling bounds, shapes can be slightly outside viewport and still visible
	// Range: from -(margin + shapeSize) to (viewportSize + margin)
	const cullingMargin = viewportSize * marginRatio
	const minPos = -(cullingMargin + shapeSize)
	const maxPos = viewportSize + cullingMargin
	return minPos + Math.random() * (maxPos - minPos)
}

function createFuzzShape(viewport: Box, marginRatio: number) {
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
				(xOutsideBounds
					? getChangeOutsideBounds(viewport.w, marginRatio)
					: getChangeInsideBounds(viewport.w, marginRatio)),
			y:
				viewport.y +
				(yOutsideBounds
					? getChangeOutsideBounds(viewport.h, marginRatio)
					: getChangeInsideBounds(viewport.h, marginRatio)),
			props: { w: shapeSize, h: shapeSize },
		})
		return { isCulled: true, id }
	} else {
		// Create a shape inside the viewport
		editor.createShape({
			id,
			type: 'geo',
			x: viewport.x + getChangeInsideBounds(viewport.w, marginRatio),
			y: viewport.y + getChangeInsideBounds(viewport.h, marginRatio),
			props: { w: shapeSize, h: shapeSize },
		})
		return { isCulled: false, id }
	}
}

it('correctly calculates the culled shapes when adding and deleting shapes', () => {
	const viewport = editor.getViewportPageBounds()
	const marginRatio = editor.options.cullingMargin
	const shapes: Array<TLShapeId | undefined> = []
	for (let i = 0; i < numberOfShapes; i++) {
		const { isCulled, id } = createFuzzShape(viewport, marginRatio)
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

it('reduces recalculation frequency with culling bounds during pan', () => {
	// Create 1000 shapes spread across a large area
	const areaSize = 10000
	for (let i = 0; i < 1000; i++) {
		editor.createShape({
			type: 'geo',
			x: Math.random() * areaSize,
			y: Math.random() * areaSize,
			props: { w: 100, h: 100 },
		})
	}

	// Track actual culling bounds changes (not just check calls)
	let boundsUpdateCount = 0
	let lastBounds = editor._cullingBounds.get()

	// Get initial culled shapes to establish baseline
	editor.getCulledShapes()
	boundsUpdateCount++ // Initial bounds set

	// Perform multiple small pan movements that cumulatively exceed cullingMargin
	const viewportBounds = editor.getViewportScreenBounds()
	const cullingMargin = editor.options.cullingMargin
	const horizontalMargin = viewportBounds.w * cullingMargin
	const panCount = 15
	// Pan distance that will eventually exceed margin but takes multiple pans to do so
	const panDistance = (horizontalMargin * 1.5) / panCount // Total pans exceed margin by 50%

	for (let i = 0; i < panCount; i++) {
		editor.pan({ x: -panDistance, y: 0 })
		editor.getCulledShapes() // Trigger culling check

		// Check if culling bounds actually changed
		const currentBounds = editor._cullingBounds.get()
		if (currentBounds !== lastBounds) {
			boundsUpdateCount++
			lastBounds = currentBounds
		}
	}

	// Panning multiple times should only trigger bounds update when exceeding cullingMargin
	// Should be significantly less than panCount
	expect(boundsUpdateCount).toBeLessThan(panCount)
	expect(boundsUpdateCount).toBeGreaterThan(1)
})

it('respects custom cullingMargin option', () => {
	// Create an editor with a larger culling margin
	const customMargin = 0.5 // 50% margin instead of default 20%
	const customEditor = new TestEditor({
		shapeUtils: [UncullableShapeUtil],
		options: { cullingMargin: customMargin },
	})
	customEditor.setScreenBounds({ x: 0, y: 0, w: 1800, h: 900 })

	const viewportBounds = customEditor.getViewportScreenBounds()
	const horizontalMargin = viewportBounds.w * customMargin // 900px

	// Create a shape that would be culled with default margin (20%) but not with 50%
	// Place it just beyond the default margin but within the custom margin
	const shapeId = createShapeId()
	customEditor.createShape({
		id: shapeId,
		type: 'geo',
		// Place shape at x = -400 (beyond 20% margin of 360px, but within 50% margin of 900px)
		x: -400,
		y: 100,
		props: { w: 100, h: 100 },
	})

	// With 50% margin, this shape should NOT be culled
	expect(customEditor.getCulledShapes()).not.toContain(shapeId)

	// Now pan far enough that the shape is outside even the 50% margin
	// Negative x pan moves viewport right in page space, pushing shape out of view to the left
	customEditor.pan({ x: -(horizontalMargin + 500), y: 0 })
	vi.advanceTimersByTime(500)

	// Now the shape should be culled
	expect(customEditor.getCulledShapes()).toContain(shapeId)
})
