import { ExportStyleCache, StyleEmbedder } from './StyleEmbedder'

function el(tag: string, attrs: Record<string, string> = {}, parent?: Element) {
	const node = document.createElement(tag)
	for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value)
	if (parent) parent.appendChild(node)
	return node
}

/** Read a tree the way an export does, and report the key each element was given. */
function readTree(cache: ExportStyleCache, root: Element) {
	document.body.appendChild(root)
	const embedder = new StyleEmbedder(root, cache)
	embedder.readRootElementStyles(root)
	return {
		embedder,
		keyOf: (node: Element) => cache.keys.get(node),
	}
}

/** The tree an export reads: a wrapper with two identically-shaped children. */
function tree(childClass = 'text') {
	const root = el('div', { class: 'wrap' })
	const a = el('span', { class: childClass }, root)
	const b = el('span', { class: childClass }, root)
	return { root, a, b }
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('ExportStyleCache keys', () => {
	it('gives two elements of the same shape under the same parent one key', () => {
		const cache = new ExportStyleCache()
		const { root, a, b } = tree()
		const { keyOf } = readTree(cache, root)
		expect(keyOf(a)).toBe(keyOf(b))
	})

	it('separates elements by tag, class and inline style', () => {
		const cache = new ExportStyleCache()
		const root = el('div', { class: 'wrap' })
		const span = el('span', { class: 'text' }, root)
		const para = el('p', { class: 'text' }, root)
		const other = el('span', { class: 'other' }, root)
		const styled = el('span', { class: 'text', style: 'color: red' }, root)
		const { keyOf } = readTree(cache, root)

		const base = keyOf(span)
		expect(keyOf(para)).not.toBe(base)
		expect(keyOf(other)).not.toBe(base)
		expect(keyOf(styled)).not.toBe(base)
	})

	it('separates elements whose ancestors differ', () => {
		const cache = new ExportStyleCache()
		const root = el('div', { class: 'root' })
		const inA = el('span', { class: 'text' }, el('div', { class: 'wrap' }, root))
		const inB = el('span', { class: 'text' }, el('div', { class: 'other' }, root))
		const { keyOf } = readTree(cache, root)
		expect(keyOf(inA)).not.toBe(keyOf(inB))
	})
})

describe('ExportStyleCache reuse', () => {
	it('reads one entry for a repeated element rather than one per element', () => {
		const cache = new ExportStyleCache()
		const { root } = tree()
		readTree(cache, root)
		// wrapper + the one shape both children share
		expect(cache.entries.size).toBe(2)
	})

	it('adds nothing on a second export of the same tree', () => {
		const cache = new ExportStyleCache()
		readTree(cache, tree().root)
		const afterFirst = cache.entries.size
		document.body.innerHTML = ''
		readTree(cache, tree().root)
		expect(cache.entries.size).toBe(afterFirst)
	})

	it('reads every element when no cache is passed', () => {
		const cache = new ExportStyleCache()
		const { root } = tree()
		document.body.appendChild(root)
		new StyleEmbedder(root).readRootElementStyles(root)
		expect(cache.entries.size).toBe(0)
	})

	/**
	 * `fetchResources` rewrites url() values on the styles it is handed, in place. A cache that
	 * shared its objects would carry one export's data URLs into the next.
	 */
	it('is not poisoned by an export mutating the styles it was given', () => {
		const cache = new ExportStyleCache()

		const first = tree()
		const a = readTree(cache, first.root)
		a.embedder.embedStyles()
		const original = first.a.getAttribute('style')
		// Stand in for fetchResources: mutate what the first export is holding.
		first.a.setAttribute('style', 'color: rebeccapurple')

		document.body.innerHTML = ''
		const second = tree()
		const b = readTree(cache, second.root)
		b.embedder.embedStyles()

		expect(second.a.getAttribute('style')).toBe(original)
	})
})

describe('ExportStyleCache self-checking', () => {
	afterEach(() => {
		for (const s of Array.from(document.head.querySelectorAll('style[data-test]'))) s.remove()
	})

	function styleSheet(css: string) {
		const el = document.createElement('style')
		el.setAttribute('data-test', 'true')
		el.textContent = css
		document.head.appendChild(el)
	}

	it('stays enabled when the key describes what it claims', () => {
		const cache = new ExportStyleCache()
		readTree(cache, tree().root)
		expect(cache.disabled).toBe(false)
		expect(cache.mismatches).toBe(0)
		expect(cache.verified.size).toBeGreaterThan(0)
	})

	/**
	 * The hole the key has by construction: a stylesheet selecting on position gives two elements
	 * of identical tag, class and ancestry different styles, and the key cannot see the
	 * difference. The check is what turns that from a wrong picture into a slow one.
	 */
	it('disables itself when a positional selector makes two same-shaped elements differ', () => {
		styleSheet(
			'.wrap > span { color: rgb(1, 2, 3) } .wrap > span:nth-child(2) { color: rgb(9, 8, 7) }'
		)
		const cache = new ExportStyleCache()
		readTree(cache, tree().root)
		expect(cache.disabled).toBe(true)
		expect(cache.mismatches).toBe(1)
	})

	it('reads every element again once disabled, and never grows the cache', () => {
		styleSheet(
			'.wrap > span { color: rgb(1, 2, 3) } .wrap > span:nth-child(2) { color: rgb(9, 8, 7) }'
		)
		const cache = new ExportStyleCache()
		readTree(cache, tree().root)
		expect(cache.entries.size).toBe(0)

		document.body.innerHTML = ''
		readTree(cache, tree().root)
		expect(cache.entries.size).toBe(0)
		expect(cache.disabled).toBe(true)
	})

	it('gives a disabled cache the same styles as no cache at all', () => {
		styleSheet(
			'.wrap > span { color: rgb(1, 2, 3) } .wrap > span:nth-child(2) { color: rgb(9, 8, 7) }'
		)
		const poisoned = new ExportStyleCache()
		const first = tree()
		const a = readTree(poisoned, first.root)
		a.embedder.embedStyles()
		const withCache = [first.a, first.b].map((n) => n.getAttribute('style'))

		document.body.innerHTML = ''
		const second = tree()
		document.body.appendChild(second.root)
		const b = new StyleEmbedder(second.root)
		b.readRootElementStyles(second.root)
		b.embedStyles()
		const withoutCache = [second.a, second.b].map((n) => n.getAttribute('style'))

		expect(withCache).toStrictEqual(withoutCache)
	})
})
