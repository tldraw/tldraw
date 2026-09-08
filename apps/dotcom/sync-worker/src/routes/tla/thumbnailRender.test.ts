import { getShapeClusters } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { enumerateBoardPages } from './boardTools'
import { makeSnapshot } from './screenshotTestHelpers'
import { buildThumbnailRenderUrl, summarizeSnapshotContent } from './thumbnailRender'

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

describe('buildThumbnailRenderUrl', () => {
	it('builds the render page URL with the token', () => {
		const url = new URL(buildThumbnailRenderUrl('https://render.example', 'the-token'))
		expect(url.pathname).toBe('/__thumbnail-render')
		expect(url.searchParams.get('token')).toBe('the-token')
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
			doc({ id: 'asset:img', typeName: 'asset', type: 'image' }),
			doc({ id: 'asset:vid', typeName: 'asset', type: 'video' }),
			doc({ id: 'asset:bm', typeName: 'asset', type: 'bookmark' }),
		],
	} as any

	it('counts the rendered page and sizes its top-level shapes', () => {
		// The child inside shape:1 and the shape on page:b are not top-level on page:a; the draw
		// stroke has no stored size and counts as a point.
		expect(summarizeSnapshotContent(snapshot, 'page:a')).toEqual({
			records: 10,
			pageShapes: 2,
			mediaAssets: 2,
			bboxWidth: 900,
			bboxHeight: 650,
		})
	})

	it('reports zero size for a page with nothing on it', () => {
		expect(summarizeSnapshotContent(snapshot, 'page:none')).toEqual({
			records: 10,
			pageShapes: 0,
			mediaAssets: 2,
			bboxWidth: 0,
			bboxHeight: 0,
		})
	})
})
