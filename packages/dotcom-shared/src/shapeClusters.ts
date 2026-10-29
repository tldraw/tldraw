import { TLArrowBinding, TLShape, VecModel } from '@tldraw/tlschema'
import { getHashForString } from '@tldraw/utils'

export interface ShapeCluster {
	id: string
	numberOfShapes: number
	/** Short title: a frame name when the cluster has one, otherwise its top keywords. */
	label: string
	/** Terms that distinguish this cluster from the others on its page, best first. */
	keywords: string[]
	shapes: TLShapeWithPlainText[]
}

/**
 * A shape carrying the plain text its ShapeUtil reports.
 *
 * `getText` is shape behaviour, not a field on the record — a text shape's string lives in
 * `props.richText` as a document, a geo shape's label is somewhere else again, and some shapes
 * compute it. Only an editor can answer it properly, so the measure render answers it once and
 * attaches it here, and everything downstream reads `plainText` instead of guessing from props.
 */
export type TLShapeWithPlainText = TLShape & { plainText?: string }

/** Axis-aligned page-space bounds. A local stand-in for Box, which lives in @tldraw/editor. */
export interface ClusterBounds {
	minX: number
	minY: number
	maxX: number
	maxY: number
}

/** A shape's page bounds and, for an arrow, where its ends are drawn in page space. */
export interface ClusterMeasurement extends ClusterBounds {
	arrow?: { start: VecModel; end: VecModel }
}

/** What clustering reads from an arrow binding: which arrow, which of its ends, bound to what. */
export type ClusterArrowBinding = Pick<TLArrowBinding, 'fromId' | 'toId'> & {
	props: Pick<TLArrowBinding['props'], 'terminal'>
}

// Spatial linkage is O(n²) — a full Prim pass plus the nearest-neighbour scan that derives eps. At a
// few thousand shapes that is milliseconds; on a very large board it would blow a Worker's CPU
// budget, so past the cap atoms are merged by binding alone rather than the call timing out.
export const MAX_CLUSTERING_ATOMS = 2500

/**
 * Group a page's shapes into clusters.
 *
 * Always starts from the hierarchy the board already stores: every top-level shape is one atom and
 * carries its descendants, so frames and groups stay whole and ungrouped shapes stay addressable.
 *
 * An arrow then joins the atoms it is bound to, through `bindings`: a group of shapes and the arrow
 * that leads from it to another group read as one thing, however far apart the two sit. Bindings are
 * records, so this needs no measure.
 *
 * When `bounds` is supplied, atoms that sit near each other are also merged by single-linkage
 * clustering (see below), which is what makes a loose arrangement of shapes read as one thing.
 * Without it, the hierarchy and the bindings are all the structure available, since sizing a shape
 * needs an editor and font metrics that a Worker does not have.
 */
export function getShapeClusters(
	shapes: TLShapeWithPlainText[],
	pageId: string,
	bounds?: Record<string, ClusterMeasurement>,
	bindings: readonly ClusterArrowBinding[] = []
): ShapeCluster[] {
	const byId = new Map(shapes.map((shape) => [shape.id, shape]))
	const atomsByRoot = new Map<string, TLShapeWithPlainText[]>()

	for (const shape of shapes) {
		let root = shape
		for (let depth = 0; depth < 100; depth++) {
			if (root.parentId === pageId) break
			const parent = byId.get(root.parentId as TLShape['id'])
			if (!parent) break
			root = parent
		}

		const members = atomsByRoot.get(root.id)
		if (members) members.push(shape)
		else atomsByRoot.set(root.id, [shape])
	}

	const atoms = [...atomsByRoot.values()]
	const clusters = bounds || bindings.length ? mergeAtoms(atoms, bounds ?? {}, bindings) : atoms

	// Ids hash the sorted member ids, so the same membership always yields the same handle. Hash
	// collisions are numbered in key order to keep that stable too.
	const keys = clusters.map(getClusterKey)
	const ids = new Array<string>(clusters.length)
	const collisions = new Map<string, number>()
	const byKey = keys
		.map((_, i) => i)
		.sort((a, b) => (keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : 0))
	for (const index of byKey) {
		const base = `cluster:${(Number(getHashForString(keys[index])) >>> 0).toString(36)}`
		const collision = collisions.get(base) ?? 0
		collisions.set(base, collision + 1)
		ids[index] = collision === 0 ? base : `${base}-${collision}`
	}

	// Labelled together, never one at a time: a term's weight depends on how many of the page's
	// *other* clusters use it, so the whole set has to be in hand.
	const labels = labelClusters(clusters, bounds)

	return clusters.map((clusterShapes, index) => ({
		id: ids[index],
		numberOfShapes: clusterShapes.length,
		label: labels[index].label,
		keywords: labels[index].keywords,
		shapes: clusterShapes,
	}))
}

// --- Labelling ----------------------------------------------------------------------------------
//
// Cheap, embedding-free cluster naming: no model call, no network, just counting.
//
// Keywords are c-TF-IDF. Each cluster is pooled into one bag of terms and scored by term frequency
// inside the cluster, discounted by how many clusters contain the term. The discount is the whole
// point: a word in every cluster says nothing about *which* cluster you are looking at, so it scores
// near zero, while a word confined to one rises even at low frequency. On a board of UI mockups that
// is the difference between labelling everything "button" and labelling one cluster "password · email".
//
// Keywords alone make a poor title, though: a write-up headed "#10949 · Make new images fit the view"
// came out as "image · native size", because the body says "image" more often than the heading does.
// People mark what a group is about by making it big and putting it first, so each shape's text is
// weighted by its font size and its reading order, and the label leads with the cluster's most
// prominent text verbatim. Frame names are typed as titles outright, so they outrank both.

const STOPWORDS = new Set(
	(
		'a an and are as at be but by for from has have how i if in into is it its of on or ' +
		'that the their there these they this to was we were what when where which who will ' +
		'with you your not no yes can could should would may might must do does did done ' +
		'my our us them he she his her him me so than then too very just also more most some ' +
		'any all each other another new one two three about over under up down out off here'
	).split(' ')
)

/** How many keywords a cluster reports. */
const MAX_KEYWORDS = 5
/** Frame names are deliberate, human-written titles, so they outweigh any text. */
const FRAME_NAME_WEIGHT = 3
/** Kept below FRAME_NAME_WEIGHT, so no heading outweighs a frame name. */
const MAX_TEXT_WEIGHT = 2.5
/** A title longer than this is cut at a word, so 600 labels still make a compact page listing. */
const MAX_TITLE_LENGTH = 40
/**
 * The `size` style in rendered pixels, as tldraw's text shapes draw it. Other shapes' labels use
 * smaller steps, but only the ordering matters here.
 */
const FONT_SIZE_BY_STYLE: Record<string, number> = { s: 18, m: 24, l: 36, xl: 44 }
/** "user research" is a better label than "user" and "research" apart. */
const BIGRAM_WEIGHT = 1.6

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^\p{L}\p{N}']+/u)
		.map((token) => token.replace(/^'+|'+$/g, ''))
		.filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token))
}

function addTokens(bag: Map<string, number>, tokens: string[], weight: number) {
	for (const token of tokens) bag.set(token, (bag.get(token) ?? 0) + weight)
	// Bigrams only from tokens adjacent within one shape's text, never across shape boundaries — two
	// unrelated labels sitting next to each other must not invent a phrase between them.
	for (let i = 0; i < tokens.length - 1; i++) {
		const bigram = `${tokens[i]} ${tokens[i + 1]}`
		bag.set(bigram, (bag.get(bigram) ?? 0) + weight * BIGRAM_WEIGHT)
	}
}

/**
 * Plain text from a shape record.
 *
 * The editor would use `ShapeUtil.getText`, but this has to run in a Worker too, where only the
 * stored record exists. So it reads the two places text is persisted: `props.richText` (a ProseMirror
 * document, walked for its text nodes) and `props.text` on shapes that still store a plain string.
 */
export function getShapeText(shape: TLShapeWithPlainText): string {
	// The editor's own answer when a measure render supplied one. Everything below is the fallback
	// for callers with only the stored record, and is necessarily an approximation of it.
	if (typeof shape.plainText === 'string') return shape.plainText

	const props = shape.props as Record<string, unknown>
	if (typeof props?.text === 'string') return props.text

	const richText = props?.richText as { content?: unknown } | undefined
	if (richText && typeof richText === 'object') {
		const parts: string[] = []
		const walk = (node: unknown) => {
			if (!node || typeof node !== 'object') return
			const record = node as { type?: unknown; text?: unknown; content?: unknown }
			if (record.type === 'text' && typeof record.text === 'string') parts.push(record.text)
			if (Array.isArray(record.content)) for (const child of record.content) walk(child)
		}
		walk(richText)
		// Joined with spaces so tokens from adjacent nodes stay separate words.
		return parts.join(' ')
	}
	return ''
}

/** A frame's name, which is a title someone typed rather than content. */
function getFrameName(shape: TLShapeWithPlainText): string | null {
	if (shape.type !== 'frame') return null
	const name = (shape.props as { name?: unknown }).name
	return typeof name === 'string' && name.trim() ? name.trim() : null
}

export interface ClusterLabel {
	label: string
	keywords: string[]
	frameNames: string[]
}

/** How large a shape's text renders, relative to the default `m` size. */
function getTextScale(shape: TLShapeWithPlainText): number {
	const props = shape.props as { size?: unknown; scale?: unknown } | undefined
	const fontSize =
		(typeof props?.size === 'string' && FONT_SIZE_BY_STYLE[props.size]) || FONT_SIZE_BY_STYLE.m
	const scale = typeof props?.scale === 'number' && props.scale > 0 ? props.scale : 1
	return (fontSize * scale) / FONT_SIZE_BY_STYLE.m
}

/** The first line of `text`, cut at a word boundary once it passes MAX_TITLE_LENGTH. */
function toTitle(text: string): string {
	const line = (text.split('\n').find((part) => part.trim()) ?? '').replace(/\s+/g, ' ').trim()
	if (line.length <= MAX_TITLE_LENGTH) return line
	const cut = line.slice(0, MAX_TITLE_LENGTH + 1)
	const lastSpace = cut.lastIndexOf(' ')
	return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : line.slice(0, MAX_TITLE_LENGTH)).trimEnd()}…`
}

/**
 * Label every cluster at once. The scores are comparative — a term's weight depends on how many other
 * clusters use it — so this cannot be done a cluster at a time.
 *
 * With `bounds`, reading order is top to bottom, then left to right; without them, the order shapes
 * arrive in. A shape the caller could not measure reads after every shape it could.
 */
export function labelClusters(
	clusters: TLShapeWithPlainText[][],
	bounds?: Record<string, ClusterBounds>
): ClusterLabel[] {
	const bags = clusters.map((shapes) => {
		const tokens = new Map<string, number>()
		const frameNames: string[] = []
		const texts: { shape: TLShapeWithPlainText; text: string; order: number }[] = []
		shapes.forEach((shape, order) => {
			const frameName = getFrameName(shape)
			if (frameName) {
				frameNames.push(frameName)
				addTokens(tokens, tokenize(frameName), FRAME_NAME_WEIGHT)
				return
			}
			const text = getShapeText(shape)
			if (text.trim()) texts.push({ shape, text, order })
		})

		texts.sort((a, b) => {
			const boxA = bounds?.[a.shape.id]
			const boxB = bounds?.[b.shape.id]
			if (boxA && boxB) {
				if (boxA.minY !== boxB.minY) return boxA.minY - boxB.minY
				if (boxA.minX !== boxB.minX) return boxA.minX - boxB.minX
			} else if (boxA || boxB) {
				return boxA ? -1 : 1
			}
			return a.order - b.order
		})

		// The title is the largest text, and the first in reading order among equals. Arrow labels
		// never qualify: they annotate a connection, they don't name the group.
		let title: { text: string; scale: number } | null = null
		for (let rank = 0; rank < texts.length; rank++) {
			const { shape, text } = texts[rank]
			const scale = getTextScale(shape)
			// Reading order matters most at the top and fades fast, so the first text counts for 1.5,
			// the second 1.25, and the rest of a long cluster close to 1.
			const weight = Math.min(
				MAX_TEXT_WEIGHT,
				Math.min(2, Math.max(0.5, scale)) * (1 + 0.5 / (1 + rank))
			)
			addTokens(tokens, tokenize(text), weight)
			if (shape.type !== 'arrow' && (!title || scale > title.scale)) title = { text, scale }
		}

		return { tokens, frameNames, title }
	})

	// How many clusters contain each term. This corpus-wide count is what makes the weight
	// comparative rather than a plain frequency.
	const documentFrequency = new Map<string, number>()
	for (const bag of bags) {
		for (const term of bag.tokens.keys()) {
			documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
		}
	}
	const clusterCount = Math.max(1, bags.length)

	return bags.map((bag) => {
		const scored = [...bag.tokens.entries()]
			.map(([term, frequency]) => ({
				term,
				score: frequency * Math.log(1 + clusterCount / (documentFrequency.get(term) ?? 1)),
			}))
			// Ties broken alphabetically, so the same board always produces the same label rather than
			// depending on Map insertion order.
			.sort((a, b) => b.score - a.score || (a.term < b.term ? -1 : 1))

		const keywords: string[] = []
		for (const { term } of scored) {
			if (keywords.length >= MAX_KEYWORDS) break
			// Skip a unigram already contained in a chosen bigram — "user" adds nothing once "user
			// research" is on the list.
			const covered = keywords.some(
				(chosen) => chosen.includes(' ') && !term.includes(' ') && chosen.split(' ').includes(term)
			)
			if (!covered) keywords.push(term)
		}

		const uniqueFrames = [...new Set(bag.frameNames)]
		let label = ''
		if (uniqueFrames.length) {
			label = uniqueFrames.slice(0, 2).join(' + ')
		} else if (bag.title) {
			// The title, then the best keyword it doesn't already say, so the label still carries what
			// sets the rest of the cluster apart.
			label = toTitle(bag.title.text)
			const titleTokens = new Set(tokenize(label))
			const extra = keywords.find((keyword) => keyword.split(' ').some((t) => !titleTokens.has(t)))
			if (extra) label = `${label} · ${extra}`
		} else if (keywords.length) {
			label = keywords.slice(0, 2).join(' · ')
		}

		return { label, keywords, frameNames: uniqueFrames }
	})
}

function getClusterKey(shapes: TLShapeWithPlainText[]) {
	return shapes
		.map((shape) => shape.id)
		.sort()
		.join(',')
}

/** Shortest distance between two boxes; 0 when they touch or overlap. */
export function boundsGapDistance(a: ClusterBounds, b: ClusterBounds): number {
	const dx = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX))
	const dy = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY))
	return Math.hypot(dx, dy)
}

function unionBounds(boxes: ClusterBounds[]): ClusterBounds {
	return {
		minX: Math.min(...boxes.map((b) => b.minX)),
		minY: Math.min(...boxes.map((b) => b.minY)),
		maxX: Math.max(...boxes.map((b) => b.maxX)),
		maxY: Math.max(...boxes.map((b) => b.maxY)),
	}
}

/**
 * Derive the merge threshold from the page itself, so "near" scales with the content: a page of
 * dense wireframes gets a small eps and each wireframe becomes a cluster, while a page of large
 * scattered groups gets a proportionally larger one.
 *
 * Within-group structure shows up as small nearest-neighbour distances, so
 * `eps = max(median nearest-neighbour × 2, median diagonal × 0.4) + 20`. The medians are robust to a
 * few far-flung outliers, and the diagonal term keeps eps proportional to shape size on sparse pages
 * where nearest-neighbour distances alone would under-estimate it.
 */
export function computeAutoEps(boxes: ClusterBounds[]): number {
	if (boxes.length < 2) return 128

	const nearest: number[] = []
	const diagonals: number[] = []
	for (let i = 0; i < boxes.length; i++) {
		let best = Infinity
		for (let j = 0; j < boxes.length; j++) {
			if (i === j) continue
			best = Math.min(best, boundsGapDistance(boxes[i], boxes[j]))
		}
		nearest.push(best)
		diagonals.push(Math.hypot(boxes[i].maxX - boxes[i].minX, boxes[i].maxY - boxes[i].minY))
	}

	nearest.sort((a, b) => a - b)
	diagonals.sort((a, b) => a - b)
	const eps =
		Math.max(
			nearest[Math.floor(nearest.length / 2)] * 2,
			diagonals[Math.floor(diagonals.length / 2)] * 0.4
		) + 20
	return Math.min(5000, Math.max(8, eps))
}

/** Does box `a` fully contain box `b`, allowing a little slack? */
function containsBox(a: ClusterBounds, b: ClusterBounds, tolerance = 2): boolean {
	return (
		a.minX - tolerance <= b.minX &&
		a.minY - tolerance <= b.minY &&
		a.maxX + tolerance >= b.maxX &&
		a.maxY + tolerance >= b.maxY &&
		(a.maxX - a.minX > b.maxX - b.minX || a.maxY - a.minY > b.maxY - b.minY)
	)
}

/**
 * Merge atoms that belong together: by arrow binding, by proximity and by containment.
 *
 * Bindings come first and need nothing but records. A bound arrow joins the atom of every shape it is
 * bound to, so a chain of boxes and arrows ends up as one cluster at any distance.
 *
 * Proximity is single-linkage clustering cut at eps. Cutting a minimum spanning tree at a threshold
 * *is* single linkage: the MST holds, for every pair of groups, exactly the shortest edge between
 * them, so dropping every edge longer than eps leaves groups in which each member is within eps of
 * some other member. Membership therefore chains — a long row of shapes is one cluster even though
 * its two ends are far apart — which is the property that makes loose arrangements read as one thing.
 *
 * An arrow takes part in proximity only through its free ends, each a point at the spot the editor
 * drew it. Its bounds would bridge: an arrow drawn between two distant shapes has a box spanning the
 * gap, so its gap distance to both ends — and to anything else the box happens to cover — is zero,
 * and with chaining one arrow is enough to pull unrelated groups, and then everything they touch, into
 * a single cluster. A point only links to what is actually near it, so an unbound arrow joins the
 * shapes its ends sit at, the same thing a bound one joins through its bindings. Bound ends are left
 * to the binding, and arrows stay out of the threshold: their ends sit on top of the shapes they
 * point at, which would drag the median nearest-neighbour distance down.
 *
 * Containment runs over everything, arrows included, because a shape genuinely inside another cannot
 * bridge anything — it can only join the thing that encloses it. An arrow can be enclosed but never
 * encloses: a diagonal arrow's box covers shapes it has nothing to do with.
 */
function mergeAtoms(
	atoms: TLShapeWithPlainText[][],
	bounds: Record<string, ClusterMeasurement>,
	bindings: readonly ClusterArrowBinding[]
): TLShapeWithPlainText[][] {
	const boxes = atoms.map((atom) => boundsForAtom(atom, bounds))
	const isArrowAtom = atoms.map((atom) => atom.every((shape) => shape.type === 'arrow'))
	const parent = atoms.map((_, i) => i)
	const find = (i: number): number => {
		while (parent[i] !== i) {
			parent[i] = parent[parent[i]]
			i = parent[i]
		}
		return i
	}
	const union = (a: number, b: number) => {
		const rootA = find(a)
		const rootB = find(b)
		if (rootA !== rootB) parent[rootB] = rootA
	}

	const atomOf = new Map<string, number>()
	atoms.forEach((atom, i) => {
		for (const shape of atom) atomOf.set(shape.id, i)
	})

	const boundEnds = new Set<string>()
	for (const binding of bindings) {
		const arrowAtom = atomOf.get(binding.fromId)
		const targetAtom = atomOf.get(binding.toId)
		if (arrowAtom === undefined || targetAtom === undefined) continue
		union(arrowAtom, targetAtom)
		boundEnds.add(`${binding.fromId}:${binding.props.terminal}`)
	}

	// One proximity node per non-arrow atom, and one per free arrow end. An atom the caller could not
	// measure has no position to cluster on, so it has no node.
	const nodes: { atom: number; box: ClusterBounds; isArrowEnd: boolean }[] = []
	for (let i = 0; i < atoms.length; i++) {
		if (!isArrowAtom[i]) {
			if (boxes[i]) nodes.push({ atom: i, box: boxes[i]!, isArrowEnd: false })
			continue
		}
		for (const shape of atoms[i]) {
			const arrow = bounds[shape.id]?.arrow
			if (!arrow) continue
			for (const terminal of ['start', 'end'] as const) {
				if (boundEnds.has(`${shape.id}:${terminal}`)) continue
				const { x, y } = arrow[terminal]
				nodes.push({ atom: i, box: { minX: x, minY: y, maxX: x, maxY: y }, isArrowEnd: true })
			}
		}
	}

	if (nodes.length >= 2 && nodes.length <= MAX_CLUSTERING_ATOMS) {
		const eps = computeAutoEps(nodes.filter((node) => !node.isArrowEnd).map((node) => node.box))

		// Prim's algorithm, computing distances on demand rather than filling an n×n matrix — at the
		// cap above a matrix would be tens of megabytes of doubles for no benefit.
		const n = nodes.length
		const inTree = new Array<boolean>(n).fill(false)
		const bestCost = new Array<number>(n).fill(Infinity)
		const bestFrom = new Array<number>(n).fill(-1)

		inTree[0] = true
		for (let i = 1; i < n; i++) {
			bestCost[i] = boundsGapDistance(nodes[0].box, nodes[i].box)
			bestFrom[i] = 0
		}

		for (let added = 1; added < n; added++) {
			let next = -1
			for (let i = 0; i < n; i++) {
				if (!inTree[i] && (next === -1 || bestCost[i] < bestCost[next])) next = i
			}
			if (next === -1) break

			inTree[next] = true
			// Only edges surviving the cut are merged, so the components are exactly single-linkage
			// clusters at this threshold.
			if (bestCost[next] <= eps) union(nodes[bestFrom[next]].atom, nodes[next].atom)

			for (let i = 0; i < n; i++) {
				if (inTree[i]) continue
				const distance = boundsGapDistance(nodes[next].box, nodes[i].box)
				if (distance < bestCost[i]) {
					bestCost[i] = distance
					bestFrom[i] = next
				}
			}
		}
	}

	// Containment: a shape sitting fully inside another joins whatever encloses it.
	if (atoms.length <= MAX_CLUSTERING_ATOMS) {
		for (let i = 0; i < atoms.length; i++) {
			const outer = boxes[i]
			if (!outer || isArrowAtom[i]) continue
			for (let j = 0; j < atoms.length; j++) {
				const inner = boxes[j]
				if (i === j || !inner) continue
				if (containsBox(outer, inner)) union(i, j)
			}
		}
	}

	// Rebuilt in the atoms' original order, so an atom that merged with nothing keeps its place.
	const merged: TLShapeWithPlainText[][] = []
	const positionOfGroup = new Map<number, number>()
	for (let i = 0; i < atoms.length; i++) {
		const group = find(i)
		const existing = positionOfGroup.get(group)
		if (existing === undefined) {
			positionOfGroup.set(group, merged.length)
			merged.push([...atoms[i]])
		} else {
			merged[existing].push(...atoms[i])
		}
	}

	return merged
}

/** An atom's extent is the union of its members', so a frame covers everything inside it. */
function boundsForAtom(
	shapes: TLShapeWithPlainText[],
	bounds: Record<string, ClusterBounds>
): ClusterBounds | null {
	const boxes = shapes.map((shape) => bounds[shape.id]).filter(Boolean)
	return boxes.length ? unionBounds(boxes) : null
}
