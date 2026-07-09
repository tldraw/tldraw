import type { Editor, TLCommentAnchor, TLCommentThread } from 'tldraw'
import { describe, expect, it } from 'vitest'
// This import is red until step 6's filter module is implemented — that is
// intentional. Implement `cluster-input.ts` per CLUSTERING-STEPS.md step 6
// until this suite passes, without modifying this file.
import { collectClusterLeaves } from './cluster-input'

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
 * Stub editor: the filter's only editor dependencies are the current page id
 * and shape page bounds (via anchorPagePoint). `shapes` maps shape id → bounds
 * for shapes that exist; anything else resolves to undefined (deleted shape).
 */
function stubEditor(
	shapes: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {}
): Editor {
	return {
		getCurrentPageId: () => CURRENT_PAGE,
		getShapePageBounds: (id: string) => {
			const bounds = shapes[id]
			if (!bounds) return undefined
			return { ...bounds, w: bounds.maxX - bounds.minX, h: bounds.maxY - bounds.minY }
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

	it('maps region anchors to their top-right corner (x + w, y)', () => {
		const leaves = collectClusterLeaves(
			stubEditor(),
			[thread('t1', { type: 'region', x: 10, y: 20, w: 30, h: 40 })],
			null
		)
		expect(leaves).toEqual([{ id: 't1', point: { x: 40, y: 20 } }])
	})

	it('maps shape and text-range anchors to the shape bounds top-right corner', () => {
		const editor = stubEditor({
			'shape:a': { minX: 0, minY: 5, maxX: 100, maxY: 50 },
		})
		const leaves = collectClusterLeaves(
			editor,
			[
				thread('t1', { type: 'shape', shapeId: 'shape:a' as any, x: 0, y: 0, isPrecise: false }),
				thread('t2', { type: 'text-range', shapeId: 'shape:a' as any, from: 0, to: 3 }),
			],
			null
		)
		expect(leaves).toEqual([
			{ id: 't1', point: { x: 100, y: 5 } },
			{ id: 't2', point: { x: 100, y: 5 } },
		])
	})

	it('places imprecise shape leaves at a custom impreciseShapeAnchor, matching pin rendering', () => {
		const editor = stubEditor({
			'shape:a': { minX: 0, minY: 0, maxX: 100, maxY: 50 },
		})
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
		// bottom-center instead of the default top-right
		const leaves = collectClusterLeaves(editor, threads, null, { x: 0.5, y: 1 })
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
