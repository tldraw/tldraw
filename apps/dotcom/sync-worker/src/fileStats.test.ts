import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { countRichTextCharacters, summarizeSnapshotDocuments } from './fileStats'

function documents(records: unknown[]): RoomSnapshot['documents'] {
	return records.map((state, i) => ({ state, lastChangedClock: i }) as any)
}

function summarize(records: unknown[]) {
	return summarizeSnapshotDocuments(documents(records))
}

function page(id: string) {
	return { typeName: 'page', id, name: 'Page', index: 'a1' }
}

function shape(overrides: Record<string, unknown> = {}) {
	return {
		typeName: 'shape',
		id: 'shape:1',
		type: 'geo',
		parentId: 'page:1',
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		props: {},
		...overrides,
	}
}

function richText(text: string) {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

describe('summarizeSnapshotDocuments', () => {
	it('reports an empty snapshot as all zeroes rather than failing', () => {
		expect(summarize([])).toEqual({
			recordsByTypeName: {},
			pages: { total: 0, maxShapesOnAPage: 0, empty: 0 },
			shapes: {
				total: 0,
				byType: {},
				maxDepth: 0,
				locked: 0,
				rotated: 0,
				orphaned: 0,
				extent: null,
			},
			text: { shapesWithText: 0, totalCharacters: 0, longestCharacters: 0 },
			bindings: {
				total: 0,
				byType: {},
				arrows: { boundBothEnds: 0, boundOneEnd: 0, unbound: 0, dangling: 0 },
			},
			styles: {},
			assets: { total: 0, byType: {}, totalSizeBytes: 0 },
		})
	})

	it('counts every record by type name, including ones it has no other opinion about', () => {
		const { recordsByTypeName } = summarize([
			page('page:1'),
			shape({ id: 'shape:1' }),
			shape({ id: 'shape:2' }),
			{ typeName: 'document', id: 'document:document' },
			{ typeName: 'camera', id: 'camera:1' },
		])
		expect(recordsByTypeName).toEqual({ page: 1, shape: 2, document: 1, camera: 1 })
	})

	it('tallies shapes by type, locked, and rotated', () => {
		const { shapes } = summarize([
			page('page:1'),
			shape({ id: 'shape:1', type: 'geo', isLocked: true }),
			shape({ id: 'shape:2', type: 'geo', rotation: 0.5 }),
			shape({ id: 'shape:3', type: 'arrow' }),
		])
		expect(shapes.byType).toEqual({ geo: 2, arrow: 1 })
		expect(shapes.total).toBe(3)
		expect(shapes.locked).toBe(1)
		expect(shapes.rotated).toBe(1)
	})

	describe('page and nesting resolution', () => {
		it('follows parent chains through frames and groups to find each shape’s page', () => {
			const { pages, shapes } = summarize([
				page('page:1'),
				shape({ id: 'shape:frame', type: 'frame', parentId: 'page:1' }),
				shape({ id: 'shape:group', type: 'group', parentId: 'shape:frame' }),
				shape({ id: 'shape:leaf', parentId: 'shape:group' }),
			])
			expect(pages).toEqual({ total: 1, maxShapesOnAPage: 3, empty: 0 })
			expect(shapes.maxDepth).toBe(3)
			expect(shapes.orphaned).toBe(0)
		})

		it('reports the busiest page and counts pages with nothing on them', () => {
			const { pages } = summarize([
				page('page:1'),
				page('page:2'),
				page('page:3'),
				shape({ id: 'shape:1', parentId: 'page:1' }),
				shape({ id: 'shape:2', parentId: 'page:2' }),
				shape({ id: 'shape:3', parentId: 'page:2' }),
			])
			expect(pages).toEqual({ total: 3, maxShapesOnAPage: 2, empty: 1 })
		})

		it('counts a shape whose parent is missing from the snapshot as orphaned', () => {
			const { shapes, pages } = summarize([
				page('page:1'),
				shape({ id: 'shape:1', parentId: 'shape:gone' }),
			])
			expect(shapes.orphaned).toBe(1)
			expect(pages).toEqual({ total: 1, maxShapesOnAPage: 0, empty: 1 })
		})

		it('terminates on a parent cycle instead of recursing forever', () => {
			const { shapes } = summarize([
				page('page:1'),
				shape({ id: 'shape:a', parentId: 'shape:b' }),
				shape({ id: 'shape:b', parentId: 'shape:a' }),
			])
			expect(shapes.orphaned).toBe(2)
			expect(shapes.total).toBe(2)
		})
	})

	describe('extent', () => {
		it('covers the top-level shapes, using width and height where the shape has them', () => {
			const { shapes } = summarize([
				page('page:1'),
				shape({ id: 'shape:1', x: -100, y: -50, props: { w: 100, h: 50 } }),
				shape({ id: 'shape:2', x: 400, y: 200, props: { w: 100, h: 100 } }),
			])
			expect(shapes.extent).toEqual({ width: 600, height: 350 })
		})

		it('ignores nested shapes, whose coordinates are relative to their parent', () => {
			const { shapes } = summarize([
				page('page:1'),
				shape({ id: 'shape:frame', type: 'frame', x: 0, y: 0, props: { w: 100, h: 100 } }),
				// would blow the extent up to 100,000 wide if it were treated as page-space
				shape({ id: 'shape:leaf', parentId: 'shape:frame', x: 100000, y: 0, props: {} }),
			])
			expect(shapes.extent).toEqual({ width: 100, height: 100 })
		})

		it('is null when a snapshot has pages but no shapes on them', () => {
			expect(summarize([page('page:1')]).shapes.extent).toBeNull()
		})
	})

	describe('text', () => {
		it('measures rich text length across nested nodes without keeping the text', () => {
			const { text } = summarize([
				page('page:1'),
				shape({ id: 'shape:1', props: { richText: richText('hello') } }),
				shape({
					id: 'shape:2',
					props: {
						richText: {
							type: 'doc',
							content: [
								{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
								{ type: 'paragraph', content: [{ type: 'text', text: 'twotwo' }] },
							],
						},
					},
				}),
			])
			expect(text).toEqual({ shapesWithText: 2, totalCharacters: 14, longestCharacters: 9 })
		})

		it('falls back to the pre-rich-text `text` prop that old snapshots still carry', () => {
			const { text } = summarize([
				page('page:1'),
				shape({ id: 'shape:1', type: 'text', props: { text: 'legacy' } }),
			])
			expect(text).toEqual({ shapesWithText: 1, totalCharacters: 6, longestCharacters: 6 })
		})

		it('does not count a shape whose rich text is empty', () => {
			const { text } = summarize([
				page('page:1'),
				shape({ id: 'shape:1', props: { richText: richText('') } }),
			])
			expect(text).toEqual({ shapesWithText: 0, totalCharacters: 0, longestCharacters: 0 })
		})
	})

	describe('styles', () => {
		it('tallies each allowlisted style prop by value', () => {
			const { styles } = summarize([
				page('page:1'),
				shape({ id: 'shape:1', props: { color: 'black', fill: 'solid', size: 'm' } }),
				shape({ id: 'shape:2', props: { color: 'black', fill: 'none', size: 'l' } }),
				shape({ id: 'shape:3', props: { color: 'red' } }),
			])
			expect(styles).toEqual({
				color: { black: 2, red: 1 },
				fill: { solid: 1, none: 1 },
				size: { m: 1, l: 1 },
			})
		})

		it('leaves out props that could hold something a user typed', () => {
			const { styles } = summarize([
				page('page:1'),
				shape({
					id: 'shape:1',
					props: { color: 'black', text: 'a secret', url: 'https://example.com', name: 'Q3 plan' },
				}),
			])
			expect(styles).toEqual({ color: { black: 1 } })
		})
	})

	describe('bindings', () => {
		function arrowBinding(id: string, fromId: string, toId: string, terminal: string) {
			return { typeName: 'binding', type: 'arrow', id, fromId, toId, props: { terminal } }
		}

		it('splits arrows by how many ends are bound', () => {
			const { bindings } = summarize([
				page('page:1'),
				shape({ id: 'shape:box', type: 'geo' }),
				shape({ id: 'shape:both', type: 'arrow' }),
				shape({ id: 'shape:one', type: 'arrow' }),
				shape({ id: 'shape:free', type: 'arrow' }),
				arrowBinding('binding:1', 'shape:both', 'shape:box', 'start'),
				arrowBinding('binding:2', 'shape:both', 'shape:box', 'end'),
				arrowBinding('binding:3', 'shape:one', 'shape:box', 'end'),
			])
			expect(bindings).toEqual({
				total: 3,
				byType: { arrow: 3 },
				arrows: { boundBothEnds: 1, boundOneEnd: 1, unbound: 1, dangling: 0 },
			})
		})

		// The three bound/unbound counts partition arrows by how many terminals have a binding
		// record; whether the target still exists is the separate `dangling` signal.
		it('counts a binding pointing at a shape that is not in the snapshot as dangling', () => {
			const { bindings } = summarize([
				page('page:1'),
				shape({ id: 'shape:arrow', type: 'arrow' }),
				arrowBinding('binding:1', 'shape:arrow', 'shape:deleted', 'end'),
			])
			expect(bindings.arrows).toEqual({
				boundBothEnds: 0,
				boundOneEnd: 1,
				unbound: 0,
				dangling: 1,
			})
		})

		it('tallies non-arrow bindings by type too', () => {
			const { bindings } = summarize([
				page('page:1'),
				{ typeName: 'binding', type: 'layout', id: 'binding:1', fromId: 'a', toId: 'b', props: {} },
			])
			expect(bindings.total).toBe(1)
			expect(bindings.byType).toEqual({ layout: 1 })
		})
	})

	describe('assets', () => {
		it('tallies assets by type and sums their declared sizes', () => {
			const { assets } = summarize([
				{ typeName: 'asset', type: 'image', id: 'asset:1', props: { fileSize: 1000 } },
				{ typeName: 'asset', type: 'image', id: 'asset:2', props: { fileSize: 2000 } },
				{ typeName: 'asset', type: 'bookmark', id: 'asset:3', props: {} },
			])
			expect(assets).toEqual({
				total: 3,
				byType: { image: 2, bookmark: 1 },
				totalSizeBytes: 3000,
			})
		})

		it('ignores the -1 file size that assets use for unknown', () => {
			const { assets } = summarize([
				{ typeName: 'asset', type: 'image', id: 'asset:1', props: { fileSize: -1 } },
			])
			expect(assets.totalSizeBytes).toBe(0)
		})
	})

	it('reads a malformed record defensively rather than throwing', () => {
		const { shapes, recordsByTypeName } = summarize([
			page('page:1'),
			// no props, non-numeric coordinates, missing parent
			{ typeName: 'shape', id: 'shape:1', type: 'geo', x: null, y: undefined },
			{ id: 'nope' },
			null,
		])
		expect(shapes.total).toBe(1)
		expect(recordsByTypeName).toEqual({ page: 1, shape: 1 })
	})

	it('buckets a record with no type under `unknown` rather than tallying it as "undefined"', () => {
		const { shapes, bindings, assets } = summarize([
			page('page:1'),
			shape({ id: 'shape:1', type: undefined }),
			{ typeName: 'binding', id: 'binding:1', fromId: 'shape:1', toId: 'shape:1' },
			{ typeName: 'asset', id: 'asset:1', props: { fileSize: 10 } },
		])
		expect(shapes.byType).toEqual({ unknown: 1 })
		expect(bindings.byType).toEqual({ unknown: 1 })
		expect(assets.byType).toEqual({ unknown: 1 })
	})
})

describe('countRichTextCharacters', () => {
	it('sums text nodes at any depth', () => {
		expect(
			countRichTextCharacters({
				type: 'doc',
				content: [
					{
						type: 'bulletList',
						content: [
							{
								type: 'listItem',
								content: [{ type: 'paragraph', content: [{ type: 'text', text: 'abc' }] }],
							},
						],
					},
					{ type: 'paragraph', content: [{ type: 'text', text: 'de' }] },
				],
			})
		).toBe(5)
	})

	it('returns 0 for anything that is not a node', () => {
		expect(countRichTextCharacters(null)).toBe(0)
		expect(countRichTextCharacters(undefined)).toBe(0)
		expect(countRichTextCharacters('not a node')).toBe(0)
	})
})
