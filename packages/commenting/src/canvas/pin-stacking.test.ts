import { Box, Mat, type Editor, type TLCommentAnchor, type TLCommentThread } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { computePinStacks, isOpenStackKeyLive, pinStackKey, pinStacksEqual } from './pin-stacking'
import { anchorPagePoint } from './thread-state'

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

/**
 * Unrotated shapes: local geometry sized by the box, placed by a translate-only page transform.
 * No comment tool registered, so the commenting options `anchorPagePoint` reads are the defaults.
 */
function stubEditor(
	shapes: Record<string, { minX: number; minY: number; maxX: number; maxY: number }> = {}
): Editor {
	const shapeId = (shape: string | { id: string }) => (typeof shape === 'string' ? shape : shape.id)
	return {
		getCurrentPageId: () => CURRENT_PAGE,
		getStateDescendant: () => undefined,
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

const SHAPE = { 'shape:a': { minX: 0, minY: 0, maxX: 200, maxY: 100 } }
/** The same shape after someone moved it — same size, different page position. */
const SHAPE_MOVED = { 'shape:a': { minX: 500, minY: 300, maxX: 700, maxY: 400 } }

function impreciseAnchor(shapeId: string): TLCommentAnchor {
	return { type: 'shape', shapeId, x: 0.2, y: 0.9, isPrecise: false } as TLCommentAnchor
}

/** The stack key the pins on `shape:a` coincide at, for the given shape placement. */
function stackKeyOn(shapes: typeof SHAPE): string {
	return pinStackKey(anchorPagePoint(stubEditor(shapes), impreciseAnchor('shape:a'))!)
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

describe('pinStacksEqual', () => {
	const pair = () =>
		new Map<string, readonly string[]>([
			['t1', ['t1', 't2']],
			['t2', ['t1', 't2']],
		])

	it('accepts equal groupings whatever the map or group identity', () => {
		const a = pair()
		expect(pinStacksEqual(a, a)).toBe(true)
		expect(pinStacksEqual(a, pair())).toBe(true)
		expect(pinStacksEqual(new Map(), new Map())).toBe(true)
	})

	it('rejects a changed member set, a changed group, and a changed order', () => {
		// the stack broke up
		expect(pinStacksEqual(pair(), new Map())).toBe(false)
		// a third pin joined
		expect(
			pinStacksEqual(
				pair(),
				new Map<string, readonly string[]>([
					['t1', ['t1', 't2', 't3']],
					['t2', ['t1', 't2', 't3']],
					['t3', ['t1', 't2', 't3']],
				])
			)
		).toBe(false)
		// same size, different members
		expect(
			pinStacksEqual(
				pair(),
				new Map<string, readonly string[]>([
					['t1', ['t1', 't3']],
					['t3', ['t1', 't3']],
				])
			)
		).toBe(false)
		// same members, reordered within the group (the list renders in this order)
		expect(
			pinStacksEqual(
				pair(),
				new Map<string, readonly string[]>([
					['t1', ['t2', 't1']],
					['t2', ['t2', 't1']],
				])
			)
		).toBe(false)
	})

	it('is blind to position — equal groupings can sit at different page points', () => {
		// The overlay holds the map's identity while this is true, which is why nothing keyed on a
		// stack's *point* may key off it. See isOpenStackKeyLive.
		const threads = [
			thread('t1', impreciseAnchor('shape:a'), { createdAt: 1 }),
			thread('t2', impreciseAnchor('shape:a'), { createdAt: 2 }),
		]
		const here = computePinStacks(stubEditor(SHAPE), threads)
		const moved = computePinStacks(stubEditor(SHAPE_MOVED), threads)
		expect(pinStacksEqual(here, moved)).toBe(true)
		expect(stackKeyOn(SHAPE)).not.toBe(stackKeyOn(SHAPE_MOVED))
	})
})

describe('isOpenStackKeyLive', () => {
	const threads = [
		thread('t1', impreciseAnchor('shape:a'), { createdAt: 1 }),
		thread('t2', impreciseAnchor('shape:a'), { createdAt: 2 }),
	]
	const byId = new Map(threads.map((t) => [t.id, t]))

	it('is live while a stack still sits at the key', () => {
		const editor = stubEditor(SHAPE)
		expect(
			isOpenStackKeyLive(editor, stackKeyOn(SHAPE), computePinStacks(editor, threads), byId)
		).toBe(true)
	})

	it('goes stale when the stack moves — the case pinStacksEqual cannot see', () => {
		// The anchor shape moved, so the point key changed while the membership didn't. Staying live
		// here strands the old key in `openStackId`, killing every hover preview on the layer.
		const editor = stubEditor(SHAPE_MOVED)
		expect(
			isOpenStackKeyLive(editor, stackKeyOn(SHAPE), computePinStacks(editor, threads), byId)
		).toBe(false)
		// and the key the stack moved *to* is live, so the caller clears rather than thrashing
		expect(
			isOpenStackKeyLive(editor, stackKeyOn(SHAPE_MOVED), computePinStacks(editor, threads), byId)
		).toBe(true)
	})

	it('goes stale once nothing stacks there, or the threads are gone', () => {
		const editor = stubEditor(SHAPE)
		// the stack collapsed to a single pin: no entries at all
		expect(isOpenStackKeyLive(editor, stackKeyOn(SHAPE), new Map(), byId)).toBe(false)
		// entries for threads that have left the input
		expect(
			isOpenStackKeyLive(editor, stackKeyOn(SHAPE), computePinStacks(editor, threads), new Map())
		).toBe(false)
	})
})
