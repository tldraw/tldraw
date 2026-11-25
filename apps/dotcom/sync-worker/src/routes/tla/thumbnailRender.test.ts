import { ThumbnailRenderParams, getShapeClusters } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { enumerateBoardPages } from './boardTools'
import { makeSnapshot } from './screenshotTestHelpers'
import { summarizeSnapshotContent, thumbnailSnapshotBodyFor } from './thumbnailRender'

describe('enumerateBoardPages', () => {
	it('lists pages in fractional-index order with names and content flags', () => {
		const pages = enumerateBoardPages(
			makeSnapshot([
				{ id: 'page:b', name: 'Ideas', index: 'a2', shapes: 1 },
				{ id: 'page:a', name: 'Cover', index: 'a1', shapes: 2 },
				{ id: 'page:c', name: '', index: 'a3', shapes: 0 },
			])
		)
		expect(pages).toEqual([
			{ index: 0, id: 'page:a', name: 'Cover', hasContent: true },
			{ index: 1, id: 'page:b', name: 'Ideas', hasContent: true },
			{ index: 2, id: 'page:c', name: 'Page 3', hasContent: false },
		])
	})
})

describe('getShapeClusters', () => {
	const shape = (id: string, parentId = 'page:a') =>
		({
			typeName: 'shape',
			id,
			parentId,
			type: 'geo',
			x: 0,
			y: 0,
			rotation: 0,
			props: { w: 10, h: 10 },
		}) as any

	it('creates one stable cluster per top-level shape', () => {
		const shapes = [shape('shape:a'), shape('shape:b')]
		const first = getShapeClusters(shapes, 'page:a')
		const second = getShapeClusters([...shapes].reverse(), 'page:a')

		expect(first).toHaveLength(2)
		expect(new Set(first.map((cluster) => cluster.id)).size).toBe(2)
		expect(
			Object.fromEntries(first.flatMap((cluster) => cluster.shapes.map((s) => [s.id, cluster.id])))
		).toEqual(
			Object.fromEntries(second.flatMap((cluster) => cluster.shapes.map((s) => [s.id, cluster.id])))
		)
	})

	it('keeps frames and groups with their descendants', () => {
		const frame = shape('shape:frame')
		const child = shape('shape:child', 'shape:frame')
		const grandchild = shape('shape:grandchild', 'shape:child')
		const cluster = getShapeClusters([frame, child, grandchild], 'page:a')[0]

		expect(cluster.numberOfShapes).toBe(3)
		expect(cluster.shapes.map((s) => s.id)).toEqual([
			'shape:frame',
			'shape:child',
			'shape:grandchild',
		])
	})

	it('changes a cluster id when its membership changes', () => {
		const frame = shape('shape:frame')
		const before = getShapeClusters([frame], 'page:a')[0]
		const after = getShapeClusters([frame, shape('shape:child', frame.id)], 'page:a')[0]

		expect(after.id).not.toBe(before.id)
	})
})

describe('summarizeSnapshotContent', () => {
	const doc = (state: Record<string, unknown>) => ({ state, lastChangedClock: 0 })
	const snapshot = {
		clock: 0,
		schema: { schemaVersion: 2, sequences: {} },
		documents: [
			doc({ id: 'document:document', typeName: 'document' }),
			doc({ id: 'page:a', typeName: 'page' }),
			doc({ id: 'page:b', typeName: 'page' }),
			doc({
				id: 'shape:1',
				typeName: 'shape',
				type: 'geo',
				parentId: 'page:a',
				x: 100,
				y: 50,
				props: { w: 200, h: 100 },
			}),
			doc({
				id: 'shape:2',
				typeName: 'shape',
				type: 'draw',
				parentId: 'page:a',
				x: 1000,
				y: 700,
				props: {},
			}),
			doc({
				id: 'shape:3',
				typeName: 'shape',
				type: 'geo',
				parentId: 'shape:1',
				x: 0,
				y: 0,
				props: { w: 10, h: 10 },
			}),
			doc({
				id: 'shape:4',
				typeName: 'shape',
				type: 'geo',
				parentId: 'page:b',
				x: -5000,
				y: 0,
				props: { w: 10, h: 10 },
			}),
			doc({
				id: 'shape:5',
				typeName: 'shape',
				type: 'image',
				parentId: 'shape:1',
				x: 0,
				y: 0,
				props: { w: 10, h: 10, assetId: 'asset:img' },
			}),
			doc({
				id: 'shape:6',
				typeName: 'shape',
				type: 'image',
				parentId: 'shape:3',
				x: 0,
				y: 0,
				props: { w: 10, h: 10, assetId: 'asset:img' },
			}),
			doc({
				id: 'shape:7',
				typeName: 'shape',
				type: 'image',
				parentId: 'page:b',
				x: -5000,
				y: 0,
				props: { w: 10, h: 10, assetId: 'asset:other' },
			}),
			doc({
				id: 'asset:img',
				typeName: 'asset',
				type: 'image',
				props: { w: 2000, h: 1000, pixelRatio: 2 },
			}),
			doc({ id: 'asset:other', typeName: 'asset', type: 'image', props: { w: 500, h: 500 } }),
			doc({ id: 'asset:vid', typeName: 'asset', type: 'video' }),
			doc({ id: 'asset:bm', typeName: 'asset', type: 'bookmark' }),
		],
	} as any

	it('counts the rendered page and sizes its top-level shapes', () => {
		// The children inside shape:1 and the shapes on page:b are not top-level on page:a; the draw
		// stroke has no stored size and counts as a point. Both nested images on page:a use asset:img,
		// counted once at its full resolution (2000x1000 at pixel ratio 2); page:b's image is not drawn.
		expect(summarizeSnapshotContent(snapshot, 'page:a')).toEqual({
			records: 14,
			pageShapes: 2,
			mediaAssets: 3,
			bboxWidth: 900,
			bboxHeight: 650,
			imageMegapixels: 8,
		})
	})

	it('reports zero size for a page with nothing on it', () => {
		expect(summarizeSnapshotContent(snapshot, 'page:none')).toEqual({
			records: 14,
			pageShapes: 0,
			mediaAssets: 3,
			bboxWidth: 0,
			bboxHeight: 0,
			imageMegapixels: 0,
		})
	})
})

function makeRenderParams(overrides: Partial<ThumbnailRenderParams> = {}): ThumbnailRenderParams {
	return {
		camera: 'content',
		x: 0,
		y: 0,
		z: 1,
		width: 1200,
		height: 630,
		theme: 'dark',
		...overrides,
	}
}

function makeSnapshotOf(states: object[]) {
	return {
		documents: states.map((state) => ({ state, lastChangedClock: 0 })),
		schema: { schemaVersion: 2, sequences: {} },
		clock: 0,
	} as any
}

describe('thumbnailSnapshotBodyFor', () => {
	it('returns the records and the render params', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshotOf([{ id: 'shape:1', typeName: 'shape' }]),
			makeRenderParams()
		)

		expect(body).toEqual({
			error: false,
			records: [{ id: 'shape:1', typeName: 'shape' }],
			schema: { schemaVersion: 2, sequences: {} },
			renderParams: {
				camera: 'content',
				// Echoed even though `content` makes the render page ignore them, so a render that omits
				// `camera` has a viewport to fall back on without a second shape of payload.
				x: 0,
				y: 0,
				z: 1,
				width: 1200,
				height: 630,
				theme: 'dark',
			},
		})
	})

	it('passes the target pageId through to the render params', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshotOf([
				{ id: 'page:abc', typeName: 'page', name: 'A', index: 'a1' },
				{ id: 'shape:1', typeName: 'shape', parentId: 'page:abc' },
			]),
			makeRenderParams({ pageId: 'page:abc' })
		)

		expect(body).toMatchObject({ renderParams: { camera: 'content', pageId: 'page:abc' } })
	})

	it('sends only the records the targeted page draws', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshotOf([
				{ id: 'document:document', typeName: 'document' },
				{ id: 'page:a', typeName: 'page' },
				{ id: 'page:b', typeName: 'page' },
				{
					id: 'shape:onA',
					typeName: 'shape',
					parentId: 'page:a',
					props: { assetId: 'asset:pic' },
				},
				{ id: 'shape:onB', typeName: 'shape', parentId: 'page:b', props: {} },
				{ id: 'asset:pic', typeName: 'asset', type: 'image' },
				{ id: 'asset:elsewhere', typeName: 'asset', type: 'image' },
			]),
			makeRenderParams({ pageId: 'page:a' })
		)

		expect(body.error ? [] : body.records.map((record) => record.id)).toEqual([
			'document:document',
			'page:a',
			'shape:onA',
			'asset:pic',
		])
	})

	it('sends the whole board when the slice cannot vouch for itself', () => {
		// The requested shape sits on another page, so a slice of page:a would not be closed. The
		// render page refuses this render itself; it just must not be handed a partial board.
		const states = [
			{ id: 'page:a', typeName: 'page' },
			{ id: 'page:b', typeName: 'page' },
			{ id: 'shape:onB', typeName: 'shape', parentId: 'page:b', props: {} },
		]

		const body = thumbnailSnapshotBodyFor(
			makeSnapshotOf(states),
			makeRenderParams({ pageId: 'page:a', shapeIds: ['shape:onB'] })
		)

		expect(body).toMatchObject({ error: false, records: states })
	})

	it('fails when the render targets a page that is no longer in the snapshot', () => {
		// A shared file's live snapshot can lose the targeted page to a concurrent edit between the
		// page being chosen and the snapshot being read. Rendering a different page would return a
		// picture of the wrong one, so the render fails instead.
		const body = thumbnailSnapshotBodyFor(
			makeSnapshotOf([{ id: 'page:still-here', typeName: 'page', name: 'A', index: 'a1' }]),
			makeRenderParams({ pageId: 'page:deleted' })
		)

		expect(body).toEqual({ error: true, message: 'Page not found' })
	})

	it('fails when a requested shape is no longer in the snapshot', () => {
		const body = thumbnailSnapshotBodyFor(
			makeSnapshotOf([
				{ id: 'page:a', typeName: 'page' },
				{ id: 'shape:here', typeName: 'shape', parentId: 'page:a', props: {} },
			]),
			makeRenderParams({ pageId: 'page:a', shapeIds: ['shape:here', 'shape:gone'] })
		)

		expect(body).toEqual({ error: true, message: 'Shape not found' })
	})

	it('fails rather than throwing on a partial snapshot with no documents', () => {
		// A corrupt R2 payload can have schema metadata but no documents array.
		const body = thumbnailSnapshotBodyFor(
			{ schema: { schemaVersion: 2, sequences: {} }, clock: 0 } as any,
			makeRenderParams()
		)

		expect(body).toEqual({ error: true, message: 'Board not found' })
	})
})
