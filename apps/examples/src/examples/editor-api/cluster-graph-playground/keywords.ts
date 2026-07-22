import { Editor, TLShape, TLShapeId } from 'tldraw'

/**
 * Cheap, embedding-free cluster labeling. Treats each cluster as a document
 * and scores unigrams/bigrams with a c-TF-IDF style weight (term frequency in
 * the cluster, discounted by how many clusters contain the term), so keywords
 * that DISTINGUISH a cluster rank above keywords common to the whole board.
 * Frame names are used verbatim as titles when present, and their tokens get
 * a scoring boost.
 */

const STOPWORDS = new Set(
	(
		'a an and are as at be but by for from has have how i if in into is it its of on or ' +
		'that the their there these they this to was we were what when where which who will ' +
		'with you your not no yes can could should would may might must do does did done ' +
		'my our us them he she his her him me so than then too very just also more most some ' +
		'any all each other another new one two three about over under up down out off here'
	).split(' ')
)

export interface ClusterLabelInfo {
	/** Short human/agent readable title for the cluster */
	label: string
	/** Top distinguishing keywords, best first */
	keywords: string[]
	/** Frame names found inside the cluster */
	frameNames: string[]
	/** Total shapes including descendants of frames and groups */
	shapeCount: number
}

interface ClusterTextBag {
	tokens: Map<string, number>
	frameNames: string[]
	shapeCount: number
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9']+/)
		.map((t) => t.replace(/^'+|'+$/g, ''))
		.filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
}

function addTokens(bag: Map<string, number>, tokens: string[], weight: number) {
	// Unigrams
	for (const t of tokens) bag.set(t, (bag.get(t) ?? 0) + weight)
	// Bigrams from adjacent tokens (never across shape boundaries) get a boost:
	// "user research" is a better keyword than "user" and "research" apart.
	for (let i = 0; i < tokens.length - 1; i++) {
		const bigram = `${tokens[i]} ${tokens[i + 1]}`
		bag.set(bigram, (bag.get(bigram) ?? 0) + weight * 1.6)
	}
}

function collectShapeText(editor: Editor, shape: TLShape, bag: ClusterTextBag) {
	bag.shapeCount++
	const text = editor.getShapeUtil(shape).getText(shape)
	if (shape.type === 'frame') {
		const name = (shape.props as { name?: string }).name?.trim()
		if (name) {
			bag.frameNames.push(name)
			// Frame names are deliberate, human-written titles: boost their tokens
			addTokens(bag.tokens, tokenize(name), 3)
		}
	} else if (text) {
		addTokens(bag.tokens, tokenize(text), 1)
	}
	for (const childId of editor.getSortedChildIdsForParent(shape.id)) {
		const child = editor.getShape(childId)
		if (child) collectShapeText(editor, child, bag)
	}
}

/**
 * Label every cluster at once — the corpus-wide document frequencies are what
 * make the scores comparative, so this can't be done one cluster at a time.
 */
export function labelClusters(editor: Editor, clusters: TLShapeId[][]): ClusterLabelInfo[] {
	const bags: ClusterTextBag[] = clusters.map((atomIds) => {
		const bag: ClusterTextBag = { tokens: new Map(), frameNames: [], shapeCount: 0 }
		for (const id of atomIds) {
			const shape = editor.getShape(id)
			if (shape) collectShapeText(editor, shape, bag)
		}
		return bag
	})

	// Document frequency per term across clusters
	const df = new Map<string, number>()
	for (const bag of bags) {
		for (const term of bag.tokens.keys()) df.set(term, (df.get(term) ?? 0) + 1)
	}
	const n = Math.max(1, bags.length)

	return bags.map((bag) => {
		const scored = Array.from(bag.tokens.entries())
			.map(([term, tf]) => ({ term, score: tf * Math.log(1 + n / (df.get(term) ?? 1)) }))
			.sort((a, b) => b.score - a.score)

		// Pick top terms, skipping unigrams already covered by a chosen bigram
		const keywords: string[] = []
		for (const { term } of scored) {
			if (keywords.length >= 5) break
			const covered = keywords.some(
				(k) => k.includes(' ') && k.split(' ').includes(term) && !term.includes(' ')
			)
			if (!covered) keywords.push(term)
		}

		const uniqueFrames = Array.from(new Set(bag.frameNames))
		const label =
			uniqueFrames.length > 0
				? uniqueFrames.slice(0, 2).join(' + ')
				: keywords.length > 0
					? keywords.slice(0, 2).join(' · ')
					: `${bag.shapeCount} shape${bag.shapeCount === 1 ? '' : 's'}`

		return { label, keywords, frameNames: uniqueFrames, shapeCount: bag.shapeCount }
	})
}
