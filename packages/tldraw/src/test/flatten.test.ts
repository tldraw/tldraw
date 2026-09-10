import {
	AssetRecordType,
	TLImageAsset,
	TLShapeId,
	TLShapePartial,
	createShapeId,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { flattenShapesToImages } from '../lib/ui/hooks/useFlatten'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let assetCount = 0

function installFlattenMocks(target: TestEditor) {
	// flattenShapesToImages calls editor.getSvgString and
	// editor.getAssetForExternalContent. Mock both to bypass the real export
	// pipeline (jsdom can't render SVGs and we don't need real pixels — these
	// tests only care about which shapes end up in which group).
	vi.spyOn(target, 'getSvgString').mockResolvedValue({
		svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
		width: 10,
		height: 10,
		trimPadding: 0,
	})
	vi.spyOn(target, 'getAssetForExternalContent').mockImplementation(async () => {
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
				src: 'data:image/svg+xml;base64,',
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
