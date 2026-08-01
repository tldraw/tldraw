import { Box, Mat, type Editor, type TLCommentAnchor, type TLCommentThread } from 'tldraw'
import { describe, expect, it } from 'vitest'
// This import is red until step 6's filter module is implemented — that is
// intentional. Implement `cluster-input.ts` per CLUSTERING-STEPS.md step 6
// until this suite passes, without modifying this file.
import { clusterLeafIdsEqual, clusterLeavesEqual, collectClusterLeaves } from './cluster-input'
import { defaultCommentingOptions, type CommentingOptions } from './options'

const CURRENT_PAGE = 'page:one'
const OTHER_PAGE = 'page:two'

/** Minimal thread record for filter tests. */
function thread(
	id: string,
	anchor: TLCommentAnchor,
	opts: { pageId?: string; resolved?: boolean } = {}
): TLCommentThread {
	return {
		id,
		typeName: 'comment-thread',
		pageId: opts.pageId ?? CURRENT_PAGE,
		anchor,
		createdBy: 'user:1',
		createdAt: 0,
		resolved: opts.resolved ? { at: 1, by: 'user:1' } : null,
		meta: {},
	} as unknown as TLCommentThread
}

/**
 * Stub editor: the filter's editor dependencies are the current page id, shape
 * geometry and page transform, and the commenting options (via anchorPagePoint,
 * read off the registered comment tool). `shapes` maps shape id → page bounds for
 * unrotated shapes that exist, modeled as local geometry sized by the box plus a
 * translate-only page transform; anything else resolves to undefined (deleted
 * shape). `options` stands in for `CommentTool.configure({ ... })`; omit it for a
 * editor with no comment tool registered, which falls back to the defaults.
 */
function stubEditor(
	shapes: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {},
	options?: Partial<CommentingOptions>
): Editor {
	const shapeId = (shape: string | { id: string }) => (typeof shape === 'string' ? shape : shape.id)
	return {
		getCurrentPageId: () => CURRENT_PAGE,
		getStateDescendant: () =>
			options ? { options: { ...defaultCommentingOptions, ...options } } : undefined,
		getShape: (id: string) => (shapes[id] ? { id } : undefined),
		getShapeGeometry: (shape: string | { id: string }) => {
			const bounds = shapes[shapeId(shape)]
			return { bounds: new Box(0, 0, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) }
		},
		getShapePageTransform: (shape: string | { id: string }) => {
			const bounds = shapes[shapeId(shape)]
			return bounds ? Mat.Translate(bounds.minX, bounds.minY) : undefined
		},
	} as unknown as Editor
}

function leafIds(leaves: { id: string }[]): string[] {
	return leaves.map((l) => l.id).sort()
}

describe('collectClusterLeaves anchor resolution', () => {
	it('maps point anchors to their page coordinates', () => {
		const leaves = collectClusterLeaves(
			stubEditor(),
			[thread('t1', { type: 'point', x: 12, y: 34 })],
			null
		)
		expect(leaves).toEqual([{ id: 't1', point: { x: 12, y: 34 } }])
	})

	it('maps region anchors to their bottom-right corner (x + w, y + h)', () => {
		const leaves = collectClusterLeaves(
			stubEditor(),
			[thread('t1', { type: 'region', x: 10, y: 20, w: 30, h: 40 })],
			null
		)
		expect(leaves).toEqual([{ id: 't1', point: { x: 40, y: 60 } }])
	})

	it('maps shape anchors to the shape bounds top-right corner', () => {
		const editor = stubEditor({
			'shape:a': { minX: 0, minY: 5, maxX: 100, maxY: 50 },
		})
		const leaves = collectClusterLeaves(
			editor,
			[thread('t1', { type: 'shape', shapeId: 'shape:a' as any, x: 0, y: 0, isPrecise: false })],
			null
		)
		expect(leaves).toEqual([{ id: 't1', point: { x: 100, y: 5 } }])
	})

	it('places imprecise shape leaves at a custom impreciseShapeAnchor, matching pin rendering', () => {
		// bottom-center instead of the default top-right
		const editor = stubEditor(
			{ 'shape:a': { minX: 0, minY: 0, maxX: 100, maxY: 50 } },
			{ impreciseShapeAnchor: { x: 0.5, y: 1 } }
		)
		const threads = [
			thread('imprecise', {
				type: 'shape',
				shapeId: 'shape:a' as any,
				x: 0,
				y: 0,
				isPrecise: false,
			}),
			thread('precise', {
				type: 'shape',
				shapeId: 'shape:a' as any,
				x: 0.5,
				y: 0.5,
				isPrecise: true,
			}),
		]
		const leaves = collectClusterLeaves(editor, threads, null)
		expect(leaves).toEqual([
			{ id: 'imprecise', point: { x: 50, y: 50 } },
			{ id: 'precise', point: { x: 50, y: 25 } },
		])
	})

	it('excludes shape anchors whose shape no longer resolves', () => {
		const leaves = collectClusterLeaves(
			stubEditor({}), // no shapes exist
			[
				thread('gone', {
					type: 'shape',
					shapeId: 'shape:deleted' as any,
					x: 0,
					y: 0,
					isPrecise: false,
				}),
				thread('kept', { type: 'point', x: 1, y: 2 }),
			],
			null
		)
		expect(leafIds(leaves)).toEqual(['kept'])
	})

	it('excludes page anchors (no spatial position)', () => {
		const leaves = collectClusterLeaves(
			stubEditor(),
			[thread('pageThread', { type: 'page' }), thread('kept', { type: 'point', x: 1, y: 2 })],
			null
		)
		expect(leafIds(leaves)).toEqual(['kept'])
	})
})

describe('collectClusterLeaves filtering', () => {
	it('excludes threads on other pages', () => {
		const leaves = collectClusterLeaves(
			stubEditor(),
			[
				thread('here', { type: 'point', x: 0, y: 0 }),
				thread('elsewhere', { type: 'point', x: 0, y: 0 }, { pageId: OTHER_PAGE }),
			],
			null
		)
		expect(leafIds(leaves)).toEqual(['here'])
	})

	it('excludes the open thread, and only the open thread', () => {
		const threads = [
			thread('open', { type: 'point', x: 0, y: 0 }),
			thread('closed', { type: 'point', x: 10, y: 0 }),
		]
		expect(leafIds(collectClusterLeaves(stubEditor(), threads, 'open'))).toEqual(['closed'])
		expect(leafIds(collectClusterLeaves(stubEditor(), threads, null))).toEqual(['closed', 'open'])
		// an id that matches no thread excludes nothing
		expect(leafIds(collectClusterLeaves(stubEditor(), threads, 'unknown'))).toEqual([
			'closed',
			'open',
		])
	})

	it('includes resolved threads (v1 decision — resolve is appearance-only)', () => {
		const leaves = collectClusterLeaves(
			stubEditor(),
			[
				thread('resolved', { type: 'point', x: 0, y: 0 }, { resolved: true }),
				thread('unresolved', { type: 'point', x: 10, y: 0 }),
			],
			null
		)
		expect(leafIds(leaves)).toEqual(['resolved', 'unresolved'])
	})

	it('returns [] for no threads', () => {
		expect(collectClusterLeaves(stubEditor(), [], null)).toEqual([])
	})

	it('applies every rule at once on a mixed set', () => {
		const editor = stubEditor({
			'shape:live': { minX: 0, minY: 0, maxX: 10, maxY: 10 },
		})
		const threads = [
			thread('point', { type: 'point', x: 1, y: 2 }),
			thread('region', { type: 'region', x: 0, y: 0, w: 5, h: 5 }),
			thread('onShape', {
				type: 'shape',
				shapeId: 'shape:live' as any,
				x: 0,
				y: 0,
				isPrecise: false,
			}),
			thread('orphaned', {
				type: 'shape',
				shapeId: 'shape:gone' as any,
				x: 0,
				y: 0,
				isPrecise: false,
			}),
			thread('pageLevel', { type: 'page' }),
			thread('otherPage', { type: 'point', x: 9, y: 9 }, { pageId: OTHER_PAGE }),
			thread('openOne', { type: 'point', x: 3, y: 3 }),
			thread('resolvedOne', { type: 'point', x: 4, y: 4 }, { resolved: true }),
		]
		const leaves = collectClusterLeaves(editor, threads, 'openOne')
		expect(leafIds(leaves)).toEqual(['onShape', 'point', 'region', 'resolvedOne'])
	})

	it('does not mutate the threads array', () => {
		const threads = [thread('a', { type: 'point', x: 0, y: 0 }), thread('b', { type: 'page' })]
		const snapshot = JSON.parse(JSON.stringify(threads))
		collectClusterLeaves(stubEditor(), threads, 'a')
		expect(JSON.parse(JSON.stringify(threads))).toEqual(snapshot)
	})
})

/**
 * These two gate the O(N²) cluster-table rebuild in `useClusterModel`: leaves that compare equal
 * keep their previous array identity, so nothing downstream recomputes. Both compare positionally
 * — `collectClusterLeaves` walks the threads in order, so a stable thread order is what makes the
 * gate hold across recomputes. If it ever stops being stable these still return the right answer,
 * just uselessly (every recompute rebuilds), which is why the order cases below are asserted.
 */
describe('clusterLeavesEqual', () => {
	const leaf = (id: string, x: number, y: number) => ({ id, point: { x, y } })

	it('accepts the same ids at the same positions, and any array identity', () => {
		const a = [leaf('t1', 0, 0), leaf('t2', 10, 20)]
		expect(clusterLeavesEqual(a, a)).toBe(true)
		expect(clusterLeavesEqual(a, [leaf('t1', 0, 0), leaf('t2', 10, 20)])).toBe(true)
		expect(clusterLeavesEqual([], [])).toBe(true)
	})

	it('rejects a position change — a moved pin must rebuild the table', () => {
		expect(clusterLeavesEqual([leaf('t1', 0, 0)], [leaf('t1', 0, 0.5)])).toBe(false)
		expect(clusterLeavesEqual([leaf('t1', 0, 0)], [leaf('t1', 0.5, 0)])).toBe(false)
	})

	it('rejects an added, removed, renamed, or reordered leaf', () => {
		expect(clusterLeavesEqual([leaf('t1', 0, 0)], [leaf('t1', 0, 0), leaf('t2', 1, 1)])).toBe(false)
		expect(clusterLeavesEqual([leaf('t1', 0, 0), leaf('t2', 1, 1)], [leaf('t1', 0, 0)])).toBe(false)
		expect(clusterLeavesEqual([leaf('t1', 0, 0)], [leaf('t2', 0, 0)])).toBe(false)
		expect(
			clusterLeavesEqual([leaf('t1', 0, 0), leaf('t2', 1, 1)], [leaf('t2', 1, 1), leaf('t1', 0, 0)])
		).toBe(false)
	})
})

describe('clusterLeafIdsEqual', () => {
	const leaf = (id: string, x: number, y: number) => ({ id, point: { x, y } })

	it('ignores positions — this is what defers the rebuild mid-drag', () => {
		expect(clusterLeafIdsEqual([leaf('t1', 0, 0)], [leaf('t1', 999, 999)])).toBe(true)
	})

	it('still rejects an added or removed thread, so those rebuild even mid-drag', () => {
		expect(clusterLeafIdsEqual([leaf('t1', 0, 0)], [leaf('t1', 0, 0), leaf('t2', 1, 1)])).toBe(
			false
		)
		expect(clusterLeafIdsEqual([leaf('t1', 0, 0), leaf('t2', 1, 1)], [leaf('t1', 0, 0)])).toBe(
			false
		)
		expect(clusterLeafIdsEqual([leaf('t1', 0, 0)], [leaf('t2', 0, 0)])).toBe(false)
	})

	it('rejects a reorder', () => {
		expect(
			clusterLeafIdsEqual(
				[leaf('t1', 0, 0), leaf('t2', 1, 1)],
				[leaf('t2', 1, 1), leaf('t1', 0, 0)]
			)
		).toBe(false)
	})
})
