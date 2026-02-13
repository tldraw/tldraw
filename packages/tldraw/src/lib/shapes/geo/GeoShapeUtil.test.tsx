import { Group2d, IndexKey, TLGeoShape, TLShapeId, createShapeId, toRichText } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { TL } from '../../../test/test-jsx'

let editor: TestEditor
let ids: Record<string, TLShapeId>

beforeEach(() => {
	editor = new TestEditor()
})

afterEach(() => {
	editor?.dispose()
})

describe('Handle snapping', () => {
	beforeEach(() => {
		ids = editor.createShapesFromJsx(
			<>
				<TL.geo ref="geo" x={0} y={0} geo="rectangle" w={100} h={100} />
				<TL.line
					ref="line"
					x={0}
					y={0}
					points={{
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 200, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 200, y: 100 },
					}}
				/>
			</>
		)
	})

	const geoShape = () => {
		const shape = editor.getShape(ids.geo)!
		assert(editor.isShapeOfType(shape, 'geo'))
		return shape
	}
	const lineShape = () => {
		const shape = editor.getShape(ids.line)!
		assert(editor.isShapeOfType(shape, 'line'))
		return shape
	}
	const lineHandles = () => editor.getShapeUtil('line').getHandles!(lineShape())!

	function startDraggingHandle() {
		editor
			.select(ids.line)
			.pointerDown(200, 0, { target: 'handle', shape: lineShape(), handle: lineHandles()[0] })
	}

	test('handles snap to the edges of the shape', () => {
		startDraggingHandle()
		editor.pointerMove(50, 5, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(lineHandles()[0]).toMatchObject({ x: 50, y: 0 })
	})

	test('handles snap to the corner of the shape', () => {
		startDraggingHandle()
		editor.pointerMove(0, 5, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(lineHandles()[0]).toMatchObject({ x: 0, y: 0 })
	})

	test('handles snap to the center of the shape', () => {
		startDraggingHandle()
		editor.pointerMove(51, 45, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(1)
		expect(lineHandles()[0]).toMatchObject({ x: 50, y: 50 })
	})

	test('does not snap to the label of the shape', () => {
		startDraggingHandle()
		const geometry = editor.getShapeUtil('geo').getGeometry(geoShape()) as Group2d
		const label = geometry.children.find((c) => c.isLabel)!
		const labelVertex = label.vertices[0]
		editor.pointerMove(labelVertex.x + 2, labelVertex.y + 2, undefined, { ctrlKey: true })
		expect(editor.snaps.getIndicators()).toHaveLength(0)
		expect(lineHandles()[0]).toMatchObject({ x: labelVertex.x + 2, y: labelVertex.y + 2 })
	})
})

describe('Resizing geo shapes with labels', () => {
	const geoId = createShapeId('geo')

	function getGeo() {
		return editor.getShape<TLGeoShape>(geoId)!
	}

	test('can be resized narrower than the initial label width', () => {
		// Create a wide shape with a short label
		editor.createShapes([
			{
				id: geoId,
				type: 'geo',
				props: { w: 300, h: 100, richText: toRichText('Hi'), geo: 'rectangle' },
			},
		])
		const initialW = getGeo().props.w

		// Resize to half width
		editor.resizeShape(geoId, { x: 0.5, y: 1 })

		// Should be narrower than initial — not locked to the initial label measurement width
		const afterW = getGeo().props.w
		expect(afterW).toBeLessThan(initialW)
	})

	test('height grows to accommodate wrapped text when resized narrower', () => {
		// Create a shape where the label fits without wrapping.
		// "Hello World" (11 chars) at medium size has raw text width = 121,
		// so min label width = 153. At initial w=300 the text is one line.
		editor.createShapes([
			{
				id: geoId,
				type: 'geo',
				props: { w: 300, h: 100, richText: toRichText('Hello World'), geo: 'rectangle' },
			},
		])

		// Resize to a narrow width AND short height — text must wrap at the narrower width,
		// and the height should grow to fit the taller wrapped text.
		editor.resizeShape(geoId, { x: 0.2, y: 0.3 })

		const geo = getGeo()
		// The height should be greater than the naive 100 * 0.3 = 30 target,
		// because the text wraps at the narrower width and needs more vertical space.
		expect(geo.props.h).toBeGreaterThan(30)
	})

	test('width is constrained to at least the minimum label width', () => {
		// "Hello World" has a minimum label width of 153 (text raw width 121 + padding 32)
		editor.createShapes([
			{
				id: geoId,
				type: 'geo',
				props: { w: 300, h: 100, richText: toRichText('Hello World'), geo: 'rectangle' },
			},
		])

		// Try to resize to something very small
		editor.resizeShape(geoId, { x: 0.1, y: 1 })

		const geo = getGeo()
		// The width should be at least MIN_SIZE_WITH_LABEL (51) — the text's minimum width
		// is actually larger (153), so the shape should be constrained to the label width
		expect(geo.props.w).toBeGreaterThanOrEqual(51)
		// And specifically, it should be at least the label's minimum width
		expect(geo.props.w).toBeGreaterThan(100)
	})

	test('shape without label can be resized freely', () => {
		editor.createShapes([
			{
				id: geoId,
				type: 'geo',
				props: { w: 300, h: 200, geo: 'rectangle' },
			},
		])

		editor.resizeShape(geoId, { x: 0.1, y: 0.1 })

		const geo = getGeo()
		expect(geo.props.w).toBeLessThan(50)
		expect(geo.props.h).toBeLessThan(50)
	})
})
