import {
	AssetRecordType,
	Mat,
	TLGeoShape,
	TLImageAsset,
	TLImageShape,
	TLShapeId,
	TLShapePartial,
	Vec,
	createShapeId,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { flattenShapesToImages, unflattenImages } from '../lib/ui/hooks/useFlatten'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let assetCount = 0

function installFlattenMocks(target: TestEditor) {
	// Mock the export pipeline (jsdom can't render SVGs). Keep the uploaded SVG text so unflatten
	// can fetch it back.
	vi.spyOn(target, 'getSvgString').mockResolvedValue({
		svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
		width: 10,
		height: 10,
		trimPadding: 0,
	})
	const uploads = new Map<string, string>()
	vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
		const svg = uploads.get(String(input))
		return svg ? new Response(svg) : new Response(null, { status: 404 })
	})
	vi.spyOn(target, 'getAssetForExternalContent').mockImplementation(async (info) => {
		const src = `https://example.com/flat-${assetCount}.svg`
		uploads.set(src, await (info as { file: File }).file.text())
		const asset: TLImageAsset = {
			id: AssetRecordType.createId(`flat-${assetCount++}`),
			typeName: 'asset',
			type: 'image',
			props: {
				w: 10,
				h: 10,
				name: 'asset.svg',
				isAnimated: false,
				mimeType: 'image/svg+xml',
				src,
			},
			meta: {},
		}
		return asset
	})
}

beforeEach(() => {
	editor = new TestEditor()
	assetCount = 0
	installFlattenMocks(editor)
})

afterEach(() => {
	editor?.dispose()
})

const box = (id: TLShapeId, x: number, y: number, w = 50, h = 50): TLShapePartial => ({
	id,
	type: 'geo',
	x,
	y,
	props: { w, h, fill: 'solid' },
})

function getImageShapeCount() {
	return editor.getCurrentPageShapes().filter((s) => s.type === 'image').length
}

describe('flattenShapesToImages clustering', () => {
	const expand = 64

	it('groups shapes within the expand threshold into one image', async () => {
		const a = createShapeId('a')
		const b = createShapeId('b')
		// gap of 30 < 2 * 64 expand, so the expanded boxes intersect
		editor.createShapes([box(a, 0, 0), box(b, 80, 0)])

		await flattenShapesToImages(editor, [a, b], expand)

		expect(getImageShapeCount()).toBe(1)
	})

	it('keeps shapes in separate images when their gap exceeds the expand threshold', async () => {
		const a = createShapeId('a')
		const b = createShapeId('b')
		// gap of 200 > 2 * 64 expand, so the expanded boxes do not intersect
		editor.createShapes([box(a, 0, 0), box(b, 250, 0)])

		await flattenShapesToImages(editor, [a, b], expand)

		expect(getImageShapeCount()).toBe(2)
	})

	it('merges all shapes into one group when a bridging shape connects them, independent of input order', async () => {
		// Layout: A — gap — bridge — gap — C. A and C alone do not intersect
		// each other's expanded bounds, but `bridge` sits in the middle and
		// should pull them all into a single group regardless of where it
		// appears in the list. The previous greedy pass would only merge
		// `bridge` into the first group it touched, leaving C as a separate
		// cluster when `bridge` came after C in the list — which made the
		// result depend on selection order.
		const a = createShapeId('a')
		const bridge = createShapeId('bridge')
		const c = createShapeId('c')

		const orders: TLShapeId[][] = [
			[a, bridge, c],
			[a, c, bridge],
			[bridge, a, c],
			[c, bridge, a],
		]

		for (const order of orders) {
			editor.dispose()
			editor = new TestEditor()
			assetCount = 0
			installFlattenMocks(editor)
			editor.createShapes([box(a, 0, 0), box(bridge, 100, 0), box(c, 200, 0)])

			await flattenShapesToImages(editor, order, expand)

			expect(getImageShapeCount(), `order ${order.join(',')}`).toBe(1)
		}
	})

	it('uses a single Box.Common group when no expand value is provided', async () => {
		// Two shapes far apart should still flatten to one image when called
		// via the no-expand path (the default useFlatten() hook).
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([box(a, 0, 0), box(b, 1000, 0)])

		await flattenShapesToImages(editor, [a, b])

		expect(getImageShapeCount()).toBe(1)
	})
})

describe('unflattenImages', () => {
	const a = createShapeId('a')
	const b = createShapeId('b')

	async function flattenBoxes() {
		editor.createShapes([box(a, 100, 100), box(b, 200, 150, 50, 80)])
		const [imageId] = (await flattenShapesToImages(editor, [a, b]))!
		return imageId
	}

	function getRestoredBoxes() {
		return editor
			.getCurrentPageShapes()
			.filter((s) => s.type === 'geo')
			.map((s) => ({ bounds: editor.getShapePageBounds(s)!.toJson(), props: s.props }))
			.sort((x, y) => x.bounds.x - y.bounds.x)
	}

	it('restores the original shapes in place of the image', async () => {
		editor.createShapes([box(a, 100, 100), box(b, 200, 150, 50, 80)])
		const before = getRestoredBoxes()
		const [imageId] = (await flattenShapesToImages(editor, [a, b]))!
		expect(getRestoredBoxes()).toEqual([])

		const result = await unflattenImages(editor, [imageId])

		expect(result).toEqual({ type: 'success', shapeIds: editor.getSelectedShapeIds() })
		expect(editor.getShape(imageId)).toBeUndefined()
		expect(getImageShapeCount()).toBe(0)
		expect(getRestoredBoxes()).toEqual(before)
	})

	it('follows the image when it was moved, rotated and scaled uniformly', async () => {
		const imageId = await flattenBoxes()
		const image = editor.getShape<TLImageShape>(imageId)!
		const flattenedOrigin = editor.getShapePageBounds(image)!.point
		editor.updateShape({
			id: imageId,
			type: 'image',
			x: image.x + 500,
			props: { w: image.props.w * 2, h: image.props.h * 2 },
		})
		editor.rotateShapesBy([imageId], Math.PI / 2)
		const imageTransform = editor.getShapePageTransform(imageId)
		// where each box's center was inside the image, scaled with it
		const expectedCenter = (x: number, y: number) =>
			Mat.applyToPoint(imageTransform, Vec.Sub({ x, y }, flattenedOrigin).mul(2))

		await unflattenImages(editor, [imageId])

		const boxes = (editor.getSelectedShapes() as TLGeoShape[])
			.map((s) => ({
				size: [s.props.w, s.props.h],
				rotation: editor.getShapePageTransform(s).rotation(),
				center: editor.getShapePageBounds(s)!.center,
			}))
			.sort((x, y) => x.size[1] - y.size[1])
		expect(boxes.map((b) => b.size)).toEqual([
			[100, 100],
			[100, 160],
		])
		for (const b of boxes) expect(b.rotation).toBeCloseTo(Math.PI / 2)
		const expected = [expectedCenter(125, 125), expectedCenter(225, 190)]
		for (let i = 0; i < 2; i++) {
			expect(boxes[i].center.x).toBeCloseTo(expected[i].x)
			expect(boxes[i].center.y).toBeCloseTo(expected[i].y)
		}
	})

	it.each([
		['cropped', () => ({ crop: { topLeft: { x: 0.1, y: 0 }, bottomRight: { x: 1, y: 1 } } })],
		['flipped', () => ({ flipX: true })],
		['stretched', (image: TLImageShape) => ({ w: image.props.w * 2 })],
	] as const)('keeps the image when it was %s', async (_, change) => {
		const imageId = await flattenBoxes()
		const image = editor.getShape<TLImageShape>(imageId)!
		editor.updateShape({ id: imageId, type: 'image', props: change(image) })

		const result = await unflattenImages(editor, [imageId])

		expect(result).toEqual({ type: 'error', reason: 'transformed' })
		expect(editor.getShape(imageId)).toBeDefined()
		expect(getRestoredBoxes()).toEqual([])
	})

	it('keeps the image when the shapes would go over the page limit', async () => {
		editor.dispose()
		editor = new TestEditor({ options: { maxShapesPerPage: 2 } })
		installFlattenMocks(editor)
		const imageId = await flattenBoxes()
		const onMaxShapes = vi.fn()
		editor.on('max-shapes', onMaxShapes)

		const result = await unflattenImages(editor, [imageId])

		expect(result).toEqual({ type: 'error', reason: 'max-shapes' })
		expect(onMaxShapes).toHaveBeenCalled()
		expect(editor.getShape(imageId)).toBeDefined()
	})

	it('ignores images that were not made by flatten', async () => {
		const imageId = await flattenBoxes()
		const assetId = editor.getShape<TLImageShape>(imageId)!.props.assetId!
		editor.updateAssets([{ ...editor.getAsset(assetId)!, meta: {} }])

		const result = await unflattenImages(editor, [imageId])

		expect(result).toEqual({ type: 'success', shapeIds: [] })
		expect(editor.getShape(imageId)).toBeDefined()
	})

	it('scales the children of a flattened frame', async () => {
		const frameId = createShapeId('frame')
		editor.createShapes([
			{ id: frameId, type: 'frame', x: 50, y: 50, props: { w: 300, h: 200 } },
			{ ...box(a, 50, 50), parentId: frameId },
			{ ...box(b, 150, 50), parentId: frameId },
		])
		const [imageId] = (await flattenShapesToImages(editor, [frameId]))!
		const image = editor.getShape<TLImageShape>(imageId)!
		editor.updateShape({
			id: imageId,
			type: 'image',
			props: { w: image.props.w * 2, h: image.props.h * 2 },
		})

		await unflattenImages(editor, [imageId])

		const sizes = getRestoredBoxes().map((b) => [b.bounds.w, b.bounds.h])
		expect(sizes).toEqual([
			[100, 100],
			[100, 100],
		])
	})

	it('keeps the stacking order of the shapes', async () => {
		const c = createShapeId('c')
		editor.createShapes([box(a, 100, 100), box(b, 120, 120), box(c, 140, 140)])
		editor.bringToFront([a])
		const before = editor.getCurrentPageShapesSorted().map((s) => editor.getShapePageBounds(s)!.x)
		const [imageId] = (await flattenShapesToImages(editor, [c, a, b]))!

		await unflattenImages(editor, [imageId])

		expect(editor.getCurrentPageShapesSorted().map((s) => editor.getShapePageBounds(s)!.x)).toEqual(
			before
		)
	})

	it('keeps the stacking order when a frame now covers part of the original area', async () => {
		editor.createShapes([box(a, 100, 100), box(b, 300, 100)])
		const [imageId] = (await flattenShapesToImages(editor, [a, b]))!
		editor.nudgeShapes([imageId], { x: 1000, y: 0 })
		editor.createShape({ type: 'frame', x: 250, y: 50, props: { w: 200, h: 200 } })

		await unflattenImages(editor, [imageId])

		const restored = editor.getCurrentPageShapesSorted().filter((s) => s.type === 'geo')
		expect(restored.map((s) => editor.getShapePageBounds(s)!.x)).toEqual([1100, 1300])
	})

	it('keeps other selected shapes selected', async () => {
		const c = createShapeId('c')
		const imageId = await flattenBoxes()
		editor.createShapes([box(c, 800, 800)])
		editor.select(imageId, c)

		await unflattenImages(editor, [imageId])

		expect(editor.getSelectedShapeIds()).toContain(c)
		expect(editor.getSelectedShapeIds()).toHaveLength(3)
	})

	it('reports malformed saved shapes as unreadable', async () => {
		const imageId = await flattenBoxes()
		vi.spyOn(window, 'fetch').mockResolvedValue(
			new Response(
				'<svg xmlns="http://www.w3.org/2000/svg"><metadata id="tldraw-flatten-source">{"type":"tldraw-flatten-source","version":1}</metadata></svg>'
			)
		)

		const result = await unflattenImages(editor, [imageId])

		expect(result).toEqual({ type: 'error', reason: 'unreadable' })
		expect(editor.getShape(imageId)).toBeDefined()
	})

	it('can be undone in one step', async () => {
		const imageId = await flattenBoxes()
		editor.markHistoryStoppingPoint()

		await unflattenImages(editor, [imageId])
		editor.undo()

		expect(editor.getShape(imageId)).toBeDefined()
		expect(getRestoredBoxes()).toEqual([])
	})
})
