import type { Editor, TLCommentAnchor, TLCommentThread } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { computePinStacks } from './pin-stacking'

const CURRENT_PAGE = 'page:one'
const OTHER_PAGE = 'page:two'

function thread(
	id: string,
	anchor: TLCommentAnchor,
	opts: { pageId?: string; createdAt?: number } = {}
): TLCommentThread {
	return {
		id,
		typeName: 'comment-thread',
		pageId: opts.pageId ?? CURRENT_PAGE,
		anchor,
		createdBy: 'user:1',
		createdAt: opts.createdAt ?? 0,
		resolved: null,
		meta: {},
	} as unknown as TLCommentThread
}

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

const SHAPE = { 'shape:a': { minX: 0, minY: 0, maxX: 200, maxY: 100 } }

function impreciseAnchor(shapeId: string): TLCommentAnchor {
	return { type: 'shape', shapeId, x: 0.2, y: 0.9, isPrecise: false } as TLCommentAnchor
}

describe('computePinStacks', () => {
	it('groups coincident imprecise pins on one shape, oldest first', () => {
		const stacks = computePinStacks(stubEditor(SHAPE), [
			thread('t2', impreciseAnchor('shape:a'), { createdAt: 20 }),
			thread('t1', impreciseAnchor('shape:a'), { createdAt: 10 }),
		])
		expect(stacks.get('t1')).toEqual(['t1', 't2'])
		expect(stacks.get('t2')).toEqual(['t1', 't2'])
	})

	it('leaves separated pins ungrouped', () => {
		const stacks = computePinStacks(stubEditor(), [
			thread('t1', { type: 'point', x: 0, y: 0 }),
			thread('t2', { type: 'point', x: 50, y: 0 }),
		])
		expect(stacks.size).toBe(0)
	})

	it('groups coincident point anchors', () => {
		const stacks = computePinStacks(stubEditor(), [
			thread('t1', { type: 'point', x: 5, y: 5 }, { createdAt: 1 }),
			thread('t2', { type: 'point', x: 5, y: 5 }, { createdAt: 2 }),
			thread('t3', { type: 'point', x: 5, y: 5 }, { createdAt: 3 }),
		])
		expect(stacks.get('t2')).toEqual(['t1', 't2', 't3'])
	})

	it('breaks creation-time ties by id so ordering is deterministic', () => {
		const stacks = computePinStacks(stubEditor(), [
			thread('t2', { type: 'point', x: 5, y: 5 }, { createdAt: 1 }),
			thread('t1', { type: 'point', x: 5, y: 5 }, { createdAt: 1 }),
		])
		expect(stacks.get('t1')).toEqual(['t1', 't2'])
	})

	it('ignores threads on other pages and unresolvable anchors', () => {
		const stacks = computePinStacks(stubEditor(SHAPE), [
			thread('t1', impreciseAnchor('shape:a')),
			thread('t2', impreciseAnchor('shape:a'), { pageId: OTHER_PAGE }),
			thread('t3', impreciseAnchor('shape:gone')),
		])
		expect(stacks.size).toBe(0)
	})

	it('does not group a precise pin sitting away from a coincident pair', () => {
		const precise: TLCommentAnchor = {
			type: 'shape',
			shapeId: 'shape:a',
			x: 0.5,
			y: 0.5,
			isPrecise: true,
		} as TLCommentAnchor
		const stacks = computePinStacks(stubEditor(SHAPE), [
			thread('t1', impreciseAnchor('shape:a'), { createdAt: 1 }),
			thread('t2', impreciseAnchor('shape:a'), { createdAt: 2 }),
			thread('t3', precise),
		])
		expect(stacks.get('t1')).toEqual(['t1', 't2'])
		expect(stacks.has('t3')).toBe(false)
	})
})
