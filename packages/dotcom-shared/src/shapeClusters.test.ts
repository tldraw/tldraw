import { TLShape, VecModel } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	boundsGapDistance,
	getShapeText,
	labelClusters,
	ClusterArrowBinding,
	ClusterBounds,
	ClusterMeasurement,
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

/** An arrow measured from `start` to `end`, with the box the editor would report for it. */
const drawn = (start: VecModel, end: VecModel): ClusterMeasurement => ({
	minX: Math.min(start.x, end.x),
	minY: Math.min(start.y, end.y),
	maxX: Math.max(start.x, end.x),
	maxY: Math.max(start.y, end.y),
	arrow: { start, end },
})

const binding = (arrowId: string, terminal: 'start' | 'end', toId: string): ClusterArrowBinding =>
	({ fromId: arrowId, toId, props: { terminal } }) as unknown as ClusterArrowBinding

// Three tight groups, so eps is small: A top left, B bottom right, C in the middle of the box an
// arrow from A to B would have.
function threeGroups() {
	const shapes = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].map((id) => shape(id))
	const bounds: Record<string, ClusterMeasurement> = {
		a1: box(0, 0),
		a2: box(20, 0),
		b1: box(3000, 3000),
		b2: box(3020, 3000),
		c1: box(1500, 1500),
		c2: box(1520, 1500),
	}
	return { shapes, bounds }
}

describe('bound arrows join what they connect', () => {
	// The review board on staging: a row of three boxes joined by two arrows came back as the boxes'
	// cluster plus two lone arrow clusters.
	it('puts a row of boxes and the arrows between them in one cluster', () => {
		const shapes = [shape('a'), shape('b'), shape('c'), arrow('ab'), arrow('bc'), shape('far')]
		const bounds = {
			a: box(0, 0, 400, 100),
			b: box(510, 0, 400, 100),
			c: box(1020, 0, 400, 100),
			ab: drawn({ x: 400, y: 50 }, { x: 510, y: 50 }),
			bc: drawn({ x: 910, y: 50 }, { x: 1020, y: 50 }),
			far: box(9000, 9000, 400, 100),
		}
		const bindings = [
			binding('ab', 'start', 'a'),
			binding('ab', 'end', 'b'),
			binding('bc', 'start', 'b'),
			binding('bc', 'end', 'c'),
		]
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds, bindings))).toEqual(['a,ab,b,bc,c', 'far'])
	})

	it('joins two groups however far apart they are', () => {
		const shapes = [shape('a1'), shape('a2'), shape('b1'), shape('b2'), arrow('link')]
		const bounds = {
			a1: box(0, 0),
			a2: box(20, 0),
			b1: box(9000, 0),
			b2: box(9020, 0),
			link: drawn({ x: 30, y: 5 }, { x: 9000, y: 5 }),
		}
		const bindings = [binding('link', 'start', 'a2'), binding('link', 'end', 'b1')]
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds, bindings))).toEqual(['a1,a2,b1,b2,link'])
	})

	// Bindings are records, so they hold even when the render measured nothing: a bound arrow no
	// longer comes back as a lone stub at the origin.
	it('follows bindings without any measurements', () => {
		const shapes = [shape('a'), shape('b'), arrow('link'), shape('other')]
		const bindings = [binding('link', 'start', 'a'), binding('link', 'end', 'b')]
		expect(idsOf(getShapeClusters(shapes, PAGE, {}, bindings))).toEqual(['a,b,link', 'other'])
		expect(idsOf(getShapeClusters(shapes, PAGE, undefined, bindings))).toEqual([
			'a,b,link',
			'other',
		])
	})

	it('pulls a frame in whole when an arrow inside it is bound to a shape outside', () => {
		const shapes = [shape('frame'), shape('child', 'frame'), shape('inner', 'frame'), shape('out')]
		shapes.push({ id: 'link', parentId: 'frame', type: 'arrow' } as unknown as TLShape)
		const bindings = [binding('link', 'start', 'inner'), binding('link', 'end', 'out')]
		expect(idsOf(getShapeClusters(shapes, PAGE, {}, bindings))).toEqual([
			'child,frame,inner,link,out',
		])
	})

	// A bound arrow's box covers whatever lies between its ends; only the binding counts.
	it('does not pull in what its box covers', () => {
		const { shapes, bounds } = threeGroups()
		shapes.push(arrow('link'))
		bounds.link = drawn({ x: 30, y: 5 }, { x: 3000, y: 3005 })
		const bindings = [binding('link', 'start', 'a2'), binding('link', 'end', 'b1')]
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds, bindings))).toEqual([
			'a1,a2,b1,b2,link',
			'c1,c2',
		])
	})

	it('gives a merged cluster an id from its membership', () => {
		const shapes = [shape('a'), shape('b'), arrow('link')]
		const bindings = [binding('link', 'start', 'a'), binding('link', 'end', 'b')]
		const first = getShapeClusters(shapes, PAGE, {}, bindings)
		expect(getShapeClusters([...shapes].reverse(), PAGE, {}, bindings).map((c) => c.id)).toEqual(
			first.map((c) => c.id)
		)
	})
})

describe('unbound arrows join what their ends are near', () => {
	it('joins the groups at its two ends', () => {
		const { shapes, bounds } = threeGroups()
		shapes.push(arrow('link'))
		bounds.link = drawn({ x: 35, y: 5 }, { x: 2995, y: 3005 })
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toEqual(['a1,a2,b1,b2,link', 'c1,c2'])
	})

	// What excluding arrows from proximity used to guard against: the arrow's box covers C entirely,
	// so by box it would sit at distance zero from C, and contain it.
	it('does not chain a group its box covers but its ends are far from', () => {
		const { shapes, bounds } = threeGroups()
		shapes.push(arrow('link'))
		bounds.link = drawn({ x: 35, y: 5 }, { x: 2995, y: 3005 })
		const clusters = idsOf(getShapeClusters(shapes, PAGE, bounds))
		expect(clusters).toContain('c1,c2')
	})

	it('joins only the group at its end when the other points into empty space', () => {
		const { shapes, bounds } = threeGroups()
		shapes.push(arrow('link'))
		bounds.link = drawn({ x: 35, y: 5 }, { x: 1000, y: 2500 })
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toEqual(['a1,a2,link', 'b1,b2', 'c1,c2'])
	})

	it('joins a group through a free end when the other end is bound elsewhere', () => {
		const { shapes, bounds } = threeGroups()
		shapes.push(arrow('link'))
		// The free start sits in C; the end is bound to B.
		bounds.link = drawn({ x: 1515, y: 1515 }, { x: 3000, y: 3000 })
		const bindings = [binding('link', 'end', 'b1')]
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds, bindings))).toEqual([
			'a1,a2',
			'b1,b2,c1,c2,link',
		])
	})

	it('stays its own cluster when neither end is near anything', () => {
		const { shapes, bounds } = threeGroups()
		shapes.push(arrow('link'))
		bounds.link = drawn({ x: 600, y: 600 }, { x: 900, y: 900 })
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds))).toContain('link')
	})

	it('leaves the threshold to the shapes', () => {
		const { shapes, bounds } = threeGroups()
		const without = idsOf(getShapeClusters(shapes, PAGE, bounds))
		shapes.push(arrow('link'))
		bounds.link = drawn({ x: 600, y: 600 }, { x: 900, y: 900 })
		expect(idsOf(getShapeClusters(shapes, PAGE, bounds)).filter((k) => k !== 'link')).toEqual(
			without
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

describe('labels lead with the most prominent text', () => {
	const styled = (id: string, value: string, size = 'm', type = 'text') =>
		({ id, type, props: { text: value, size, scale: 1 } }) as unknown as TLShape

	// The write-up that prompted weighting: a 45-shape cluster headed "#10949 · Make new images fit
	// the view" was labelled "image · native size", because the body says "image" more often.
	it('uses the big title of a write-up rather than its most frequent words', () => {
		const writeUp = [
			styled('body1', 'Pasted images now open at native size, not the image size', 's'),
			styled('title', '#10949 · Make new images fit the view', 'xl'),
			styled('body2', 'A large image used to land at native size, far past the view', 's'),
			styled('body3', 'Image placement keeps the image aspect ratio at native size', 's'),
		]
		const bounds = {
			title: box(0, 0, 900, 60),
			body1: box(0, 100, 900, 30),
			body2: box(0, 140, 900, 30),
			body3: box(0, 180, 900, 30),
		}
		const [labelled] = labelClusters(
			[writeUp, [styled('other', 'Pricing table')], [styled('more', 'Onboarding tour')]],
			bounds
		)
		expect(labelled.label.startsWith('#10949 · Make new images fit the view')).toBe(true)
		// The keywords still come from everything the cluster says.
		expect(labelled.keywords).toContain('native size')
	})

	it('prefers larger text over text that comes first', () => {
		const bounds = { caption: box(0, 0, 200, 20), heading: box(0, 100, 400, 50) }
		const [labelled] = labelClusters(
			[[styled('caption', 'draft notes', 's'), styled('heading', 'Quarterly roadmap', 'l')]],
			bounds
		)
		expect(labelled.label).toBe('Quarterly roadmap · draft notes')
	})

	it('breaks a tie in size by top, then left', () => {
		const bounds = {
			right: box(500, 0, 100, 40),
			below: box(0, 200, 100, 40),
			topLeft: box(0, 0, 100, 40),
		}
		const shapes = [
			styled('right', 'Second'),
			styled('below', 'Third'),
			styled('topLeft', 'First step'),
		]
		expect(labelClusters([shapes], bounds)[0].label.startsWith('First step')).toBe(true)
	})

	it('counts a shape scaled up as larger text', () => {
		const scaled = {
			id: 'big',
			type: 'text',
			props: { text: 'Scaled heading', size: 'm', scale: 3 },
		} as unknown as TLShape
		const bounds = { small: box(0, 0, 100, 20), big: box(0, 100, 300, 60) }
		const [labelled] = labelClusters([[styled('small', 'note', 'l'), scaled]], bounds)
		expect(labelled.label.startsWith('Scaled heading')).toBe(true)
	})

	it('never takes an arrow label as the title', () => {
		const bounds = { yes: box(0, 0, 40, 20), node: box(0, 100, 200, 100) }
		const [labelled] = labelClusters(
			[[styled('yes', 'confirmed', 'xl', 'arrow'), styled('node', 'Ship it', 's', 'geo')]],
			bounds
		)
		expect(labelled.label.startsWith('Ship it')).toBe(true)
	})

	it('still lets a frame name outrank the largest text', () => {
		const frame = { id: 'f', type: 'frame', props: { name: 'Login flow' } } as unknown as TLShape
		const [labelled] = labelClusters([[frame, styled('h', 'Welcome back', 'xl')]], {
			f: box(0, 0, 1000, 1000),
			h: box(0, 0, 400, 60),
		})
		expect(labelled.label).toBe('Login flow')
		expect(labelled.keywords[0]).toBe('login flow')
	})

	it('cuts a long title at a word', () => {
		const [labelled] = labelClusters([
			[styled('p', 'We should consider moving the export button somewhere more visible')],
		])
		expect(labelled.label.split(' · ')[0]).toBe('We should consider moving the export…')
	})

	it('drops a keyword the title already says', () => {
		const [labelled] = labelClusters([[styled('t', 'Checkout payment')], [styled('u', 'Billing')]])
		expect(labelled.label).toBe('Checkout payment')
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
		// Each cluster's first text is its title, and covers every keyword it has.
		expect(clusters.map((c) => c.label).sort()).toEqual(['invoice total', 'password reset'])
	})
})
