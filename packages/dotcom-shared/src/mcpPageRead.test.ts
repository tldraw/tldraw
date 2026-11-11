import { TLArrowBinding, TLShape } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { findMcpPage, readMcpPage, toShapeMeasurements } from './mcpPageRead'

const PAGES = [
	{ id: 'page:b', name: 'Ideas', index: 'a2' },
	{ id: 'page:a', name: '', index: 'a1' },
]

function shape(id: string, overrides: Record<string, unknown> = {}): TLShape {
	return {
		id,
		typeName: 'shape',
		type: 'geo',
		parentId: 'page:a',
		index: 'a1',
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
		props: { w: 10, h: 10 },
		...overrides,
	} as unknown as TLShape
}

describe('findMcpPage', () => {
	it('orders pages as the editor does, and names an unnamed one by its position', () => {
		expect(findMcpPage(PAGES, { kind: 'ordinal', ordinal: 0 })).toEqual({
			ok: true,
			page: { index: 0, id: 'page:a', name: 'Page 1' },
		})
		expect(findMcpPage(PAGES, { kind: 'id', id: 'page:b' })).toEqual({
			ok: true,
			page: { index: 1, id: 'page:b', name: 'Ideas' },
		})
	})

	it('says how many pages there are when the selector names none', () => {
		expect(findMcpPage(PAGES, { kind: 'ordinal', ordinal: 2 })).toEqual({
			ok: false,
			reason: 'page_out_of_range',
			pageCount: 2,
		})
		expect(findMcpPage([], { kind: 'ordinal', ordinal: 0 })).toEqual({
			ok: false,
			reason: 'no_pages',
			pageCount: 0,
		})
	})
})

describe('toShapeMeasurements', () => {
	// A non-finite box would give NaN distances and detach its shape from the clustering.
	it('drops a malformed box, and malformed arrow ends or dimensions on a good one', () => {
		const measured = toShapeMeasurements({
			good: { x: 1, y: 2, w: 3, h: 4, text: 'Hi', dimensions: { w: 3, h: 4 } },
			unbounded: { x: 0, y: 0, w: Infinity, h: 1 },
			badExtras: {
				x: 0,
				y: 0,
				w: 1,
				h: 1,
				arrow: { start: { x: 0, y: NaN }, end: { x: 1, y: 1 } },
				dimensions: { w: -1, h: 1 },
			},
		} as any)

		expect(measured).toEqual({
			good: { minX: 1, minY: 2, maxX: 4, maxY: 6, text: 'Hi', dimensions: { w: 3, h: 4 } },
			badExtras: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
		})
	})
})

describe('readMcpPage', () => {
	// A frame far from a box joined to another box by an arrow: two clusters.
	const shapes = [
		shape('shape:frame', { type: 'frame', x: 10_000 }),
		shape('shape:child', { parentId: 'shape:frame', x: 5, y: 5 }),
		shape('shape:left'),
		shape('shape:right', { x: 50 }),
		shape('shape:arrow', { type: 'arrow', props: {} }),
	]
	const bindings = [
		{
			id: 'binding:1',
			type: 'arrow',
			fromId: 'shape:arrow',
			toId: 'shape:left',
			props: { terminal: 'start' },
		},
		{
			id: 'binding:2',
			type: 'arrow',
			fromId: 'shape:arrow',
			toId: 'shape:right',
			props: { terminal: 'end' },
		},
	] as unknown as TLArrowBinding[]
	const measurements = {
		'shape:frame': { minX: 10_000, minY: 0, maxX: 10_010, maxY: 10 },
		'shape:child': { minX: 10_005, minY: 5, maxX: 10_010, maxY: 10, text: 'Inside' },
		'shape:left': { minX: 0, minY: 0, maxX: 10, maxY: 10 },
		'shape:right': { minX: 50, minY: 0, maxX: 60, maxY: 10 },
		'shape:arrow': {
			minX: 10,
			minY: 5,
			maxX: 50,
			maxY: 5,
			arrow: { start: { x: 10, y: 5 }, end: { x: 50, y: 5 } },
		},
	}

	function read(clusterIds: string[] = []) {
		return readMcpPage({
			pageId: 'page:a',
			pageName: 'Cover',
			shapes,
			bindings,
			measurements,
			clusterIds,
		})
	}

	function clusterOf(shapeId: string) {
		const all = read(read().clusters.map((c) => c.id))
		return all.details.find((c) => c.shapes.some((s) => s.id === shapeId))!
	}

	it('summarises every cluster but sends no records unless asked', () => {
		const page = read()
		expect(page.clusters.map((c) => [c.numberOfShapes, c.bounds])).toEqual(
			expect.arrayContaining([
				[3, { x: 0, y: 0, w: 60, h: 10 }],
				[2, { x: 10_000, y: 0, w: 10, h: 10 }],
			])
		)
		expect(page).toMatchObject({ details: [], ancestors: [], bindings: [], arrows: {} })
	})

	it("sends the named cluster's shapes with their measured text, bindings and arrow ends", () => {
		const arrowCluster = clusterOf('shape:arrow')
		const page = read([arrowCluster.id])

		expect(page.details.map((c) => c.id)).toEqual([arrowCluster.id])
		expect(page.clusters).toEqual([])
		expect(page.bindings.map((b) => b.id)).toEqual(['binding:1', 'binding:2'])
		expect(page.arrows).toEqual({ 'shape:arrow': measurements['shape:arrow'].arrow })

		const framed = read([clusterOf('shape:child').id])
		const child = framed.details[0].shapes.find((s) => s.id === 'shape:child')
		expect(child).toMatchObject({ plainText: 'Inside' })
		expect(framed.bindings).toEqual([])
	})

	it('drops an unknown cluster id, so the caller can say which were missing', () => {
		expect(read(['cluster:nope']).details).toEqual([])
	})
})
