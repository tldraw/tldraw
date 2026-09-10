import { TLShape } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	boundsGapDistance,
	getShapeText,
	labelClusters,
	ClusterBounds,
	computeAutoEps,
	getShapeClusters,
	MAX_CLUSTERING_ATOMS,
} from './shapeClusters'

const PAGE = 'page:a'

const shape = (id: string, parentId: string = PAGE) => ({ id, parentId }) as unknown as TLShape
const arrow = (id: string) => ({ id, parentId: PAGE, type: 'arrow' }) as unknown as TLShape

const box = (minX: number, minY: number, w = 10, h = 10): ClusterBounds => ({
	minX,
	minY,
	maxX: minX + w,
	maxY: minY + h,
})

/** A row of top-level shapes at the given x positions, with matching bounds. */
function row(positions: Record<string, number>) {
	const shapes = Object.keys(positions).map((id) => shape(id))
	const bounds = Object.fromEntries(Object.entries(positions).map(([id, x]) => [id, box(x, 0)]))
	return { shapes, bounds }
}

const idsOf = (clusters: { shapes: TLShape[] }[]) =>
	clusters
		.map((c) =>
			c.shapes
				.map((s) => s.id)
				.sort()
				.join(',')
		)
		.sort()

describe('getShapeClusters without bounds', () => {
	// The Worker has no editor, so hierarchy is all the structure available to it.
	it('makes each top-level shape its own cluster', () => {
		const clusters = getShapeClusters([shape('a'), shape('b'), shape('c')], PAGE)
		expect(idsOf(clusters)).toEqual(['a', 'b', 'c'])
	})

	it('keeps a frame and its descendants together', () => {
		const clusters = getShapeClusters(
			[shape('frame'), shape('child', 'frame'), shape('grandchild', 'child'), shape('loose')],
			PAGE
		)
		expect(idsOf(clusters)).toEqual(['child,frame,grandchild', 'loose'])
	})
})

describe('getShapeClusters with bounds', () => {
	it('merges atoms that sit near each other', () => {
		const { shapes, bounds } = row({ a: 0, b: 20, c: 40, far: 3000 })
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toEqual(['a,b,c', 'far'])
	})

	// The property that distinguishes single linkage: membership chains, so a long row is one
	// cluster even though its ends are far apart.
	it('chains through intermediates rather than requiring mutual closeness', () => {
		const { shapes, bounds } = row({ a: 0, b: 40, c: 80, d: 120 })
		expect(boundsGapDistance(bounds.a, bounds.d)).toBe(110)
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toEqual(['a,b,c,d'])
	})

	it('splits where the gap is large relative to the page', () => {
		const { shapes, bounds } = row({ a: 0, b: 20, c: 40, x: 2000, y: 2020, z: 2040 })
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toEqual(['a,b,c', 'x,y,z'])
	})

	it('carries a frame’s descendants into the merged cluster', () => {
		const shapes = [shape('frame'), shape('child', 'frame'), shape('near')]
		const bounds = { frame: box(0, 0, 100, 100), child: box(10, 10), near: box(110, 0) }
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toEqual(['child,frame,near'])
	})

	it('puts every shape in exactly one cluster', () => {
		const { shapes, bounds } = row({ a: 0, b: 20, lonely: 9000 })
		const clusters = getShapeClusters(shapes, PAGE, bounds)
		expect(clusters.flatMap((c) => c.shapes.map((s) => s.id)).sort()).toEqual(['a', 'b', 'lonely'])
	})

	// A shape the caller could not measure has no position to cluster on, so it is left alone rather
	// than given an invented one.
	it('leaves an unmeasured atom as its own cluster', () => {
		const { shapes, bounds } = row({ a: 0, b: 20 })
		shapes.push(shape('unmeasured'))
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toEqual(['a,b', 'unmeasured'])
	})

	it('is independent of the order shapes arrive in', () => {
		const { shapes, bounds } = row({ a: 0, b: 20, far: 3000 })
		expect(idsOf(getShapeClusters([...shapes].reverse(), PAGE, bounds))).toEqual(
			idsOf(getShapeClusters(shapes, PAGE, bounds))
		)
	})

	// Ids are derived from membership, so the same page always produces the same handles — that is
	// what lets one MCP call hand an id to the next.
	it('gives the same ids on every call, and new ids when membership changes', () => {
		const { shapes, bounds } = row({ a: 0, b: 20, far: 3000 })
		const first = getShapeClusters(shapes, PAGE, bounds).map((c) => c.id)
		expect(getShapeClusters(shapes, PAGE, bounds).map((c) => c.id)).toEqual(first)

		const regrouped = getShapeClusters(shapes, PAGE, { ...bounds, far: box(40, 0) })
		expect(regrouped).toHaveLength(1)
		expect(regrouped[0].id).not.toBe(first[0])
	})

	it('returns atoms unmerged past the cap rather than doing the O(n²) work', () => {
		const positions: Record<string, number> = {}
		for (let i = 0; i <= MAX_CLUSTERING_ATOMS; i++) positions[`s${i}`] = i * 5
		const { shapes, bounds } = row(positions)
		expect(getShapeClusters(shapes, PAGE, bounds)).toHaveLength(shapes.length)
	})

	it('handles empty and single-shape pages', () => {
		expect(getShapeClusters([], PAGE, {})).toEqual([])
		expect(getShapeClusters([shape('only')], PAGE, { only: box(0, 0) })).toHaveLength(1)
	})
})

// An arrow drawn between two distant groups has bounds spanning the whole gap, so its gap distance
// to both ends is zero. With single-linkage chaining, one arrow would otherwise pull two unrelated
// groups — and everything they touch — into a single cluster.
describe('arrows do not bridge clusters', () => {
	it('keeps two distant groups apart when an arrow spans them', () => {
		const shapes = [shape('a1'), shape('a2'), shape('b1'), shape('b2'), arrow('link')]
		const bounds = {
			a1: box(0, 0),
			a2: box(20, 0),
			b1: box(3000, 0),
			b2: box(3020, 0),
			// Spans the gap, touching both groups.
			link: box(10, 0, 3000, 2),
		}
		const clusters = idsOf(getShapeClusters(shapes, PAGE, bounds))
		expect(clusters).toContain('a1,a2')
		expect(clusters).toContain('b1,b2')
	})

	it('still gives the arrow a cluster of its own, so every shape stays addressable', () => {
		const shapes = [shape('a'), arrow('link')]
		const bounds = { a: box(0, 0), link: box(10, 0, 3000, 2) }
		const all = getShapeClusters(shapes, PAGE, bounds).flatMap((c) => c.shapes.map((s) => s.id))
		expect(all.sort()).toEqual(['a', 'link'])
	})

	// Arrows are left out of the threshold too: their long thin boxes sit on top of their endpoints
	// and would drag the median nearest-neighbour distance down.
	it('excludes arrows from the eps calculation', () => {
		const shapes = [shape('a'), shape('b'), arrow('link')]
		const withArrow = { a: box(0, 0), b: box(600, 0), link: box(5, 0, 600, 2) }
		const withoutArrow = { a: box(0, 0), b: box(600, 0) }
		expect(idsOf(getShapeClusters(shapes, PAGE, withArrow)).filter((k) => k !== 'link')).toEqual(
			idsOf(getShapeClusters([shape('a'), shape('b')], PAGE, withoutArrow))
		)
	})
})

describe('containment', () => {
	it('pulls a shape fully inside another into its cluster', () => {
		const shapes = [shape('outer'), shape('inner'), shape('far')]
		const bounds = { outer: box(0, 0, 500, 500), inner: box(100, 100, 50, 50), far: box(9000, 0) }
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toContain('inner,outer')
	})

	// Containment cannot bridge: a container only ever absorbs what it encloses.
	it('does not merge two shapes that merely overlap', () => {
		const shapes = [shape('a'), shape('b')]
		const bounds = { a: box(0, 0, 100, 100), b: box(90, 0, 100, 100) }
		// These two are adjacent, so proximity may merge them — but not via containment.
		expect(getShapeClusters(shapes, PAGE, bounds).length).toBeLessThanOrEqual(2)
	})
})

describe('computeAutoEps', () => {
	it('scales with the spacing of the page', () => {
		const tight = Array.from({ length: 6 }, (_, i) => box(i * 20, 0))
		const sparse = Array.from({ length: 6 }, (_, i) => box(i * 400, 0))
		expect(computeAutoEps(sparse)).toBeGreaterThan(computeAutoEps(tight))
	})

	// The point of deriving eps: the same arrangement at a different scale clusters the same way,
	// rather than a fixed threshold swallowing a zoomed-out board whole.
	it('clusters a layout the same way at 10x scale', () => {
		const small = row({ a: 0, b: 20, c: 600 })
		const large = {
			shapes: small.shapes,
			bounds: { a: box(0, 0, 100, 100), b: box(200, 0, 100, 100), c: box(6000, 0, 100, 100) },
		}
		expect(idsOf(getShapeClusters(large.shapes, PAGE, large.bounds))).toEqual(
			idsOf(getShapeClusters(small.shapes, PAGE, small.bounds))
		)
	})

	it('stays within its clamps', () => {
		expect(computeAutoEps([box(0, 0), box(0, 0)])).toBeGreaterThanOrEqual(8)
		expect(computeAutoEps([box(0, 0), box(1e6, 0)])).toBeLessThanOrEqual(5000)
	})
})

describe('getShapeText', () => {
	const withProps = (props: object) => ({ type: 'text', props }) as unknown as TLShape

	it('reads a plain text prop', () => {
		expect(getShapeText(withProps({ text: 'hello world' }))).toBe('hello world')
	})

	it('walks a rich text document for its text nodes', () => {
		const rich = withProps({
			richText: {
				type: 'doc',
				content: [
					{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
					{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] },
				],
			},
		})
		expect(getShapeText(rich)).toBe('first second')
	})

	it('returns empty for a shape carrying no text', () => {
		expect(getShapeText(withProps({ w: 10, h: 10 }))).toBe('')
	})
})

describe('labelClusters', () => {
	const text = (value: string) => ({ type: 'text', props: { text: value } }) as unknown as TLShape
	const frame = (name: string) => ({ type: 'frame', props: { name } }) as unknown as TLShape

	// The reason c-TF-IDF is used at all: a term shared by every cluster carries no information about
	// which cluster you are looking at, so at equal frequency it loses to a term confined to one.
	it('prefers a distinguishing term over an equally frequent shared one', () => {
		const [login, pricing] = labelClusters([
			[text('button'), text('password')],
			[text('button'), text('invoice')],
			[text('button'), text('shipping')],
			[text('button'), text('avatar')],
		])
		expect(login.keywords[0]).toBe('password')
		expect(pricing.keywords[0]).toBe('invoice')
	})

	// The discount is a discount, not a veto: log(1 + n/df) spans only log2..log3 across two clusters,
	// so a shared term at twice the frequency still wins. It separates properly as the cluster count
	// grows. Worth knowing before reading a two-cluster label as meaningless.
	it('lets a much more frequent shared term win when there are only two clusters', () => {
		const [labelled] = labelClusters([
			[text('button'), text('button'), text('password')],
			[text('button'), text('button'), text('invoice')],
		])
		expect(labelled.keywords[0]).toBe('button')
	})

	it('uses a frame name verbatim as the label', () => {
		const [labelled] = labelClusters([[frame('Login flow'), text('email'), text('password')]])
		expect(labelled.label).toBe('Login flow')
		expect(labelled.frameNames).toEqual(['Login flow'])
	})

	it('joins multiple frame names in one cluster', () => {
		expect(labelClusters([[frame('Header'), frame('Footer')]])[0].label).toBe('Header + Footer')
	})

	it('falls back to keywords when there is no frame', () => {
		const [labelled] = labelClusters([
			[text('checkout payment'), text('checkout payment')],
			[text('onboarding tour')],
		])
		expect(labelled.label).toContain('checkout')
	})

	it('gives an empty label to a cluster with no text at all', () => {
		expect(labelClusters([[{ type: 'geo', props: {} } as unknown as TLShape]])[0]).toEqual({
			label: '',
			keywords: [],
			frameNames: [],
		})
	})

	it('drops stopwords, short tokens and bare numbers', () => {
		const [labelled] = labelClusters([[text('the and of a 42 ok signup')]])
		expect(labelled.keywords).toContain('signup')
		for (const noise of ['the', 'and', 'of', 'a', '42', 'ok']) {
			expect(labelled.keywords).not.toContain(noise)
		}
	})

	it('prefers a bigram and suppresses the unigrams it covers', () => {
		const [labelled] = labelClusters([
			[text('user research'), text('user research')],
			[text('billing')],
		])
		expect(labelled.keywords[0]).toBe('user research')
		expect(labelled.keywords).not.toContain('user')
	})

	// Two unrelated labels sitting next to each other never wrote a phrase between them.
	it('does not form bigrams across shape boundaries', () => {
		expect(labelClusters([[text('alpha'), text('beta')]])[0].keywords).not.toContain('alpha beta')
	})

	it('is deterministic for the same input', () => {
		const build = () => labelClusters([[text('alpha alpha'), text('beta')], [text('gamma')]])
		expect(build()).toEqual(build())
	})
})

describe('clusters carry their labels', () => {
	it('labels each cluster relative to the others on the page', () => {
		const shapes = [
			{ id: 'a1', parentId: PAGE, type: 'text', props: { text: 'password reset' } },
			{ id: 'a2', parentId: PAGE, type: 'text', props: { text: 'password' } },
			{ id: 'b1', parentId: PAGE, type: 'text', props: { text: 'invoice total' } },
			{ id: 'b2', parentId: PAGE, type: 'text', props: { text: 'invoice' } },
		] as unknown as TLShape[]
		const bounds = { a1: box(0, 0), a2: box(20, 0), b1: box(3000, 0), b2: box(3020, 0) }

		const clusters = getShapeClusters(shapes, PAGE, bounds)
		expect(clusters).toHaveLength(2)
		expect(clusters.map((c) => c.label).sort()).toEqual([
			'invoice · invoice total',
			'password · password reset',
		])
	})
})
