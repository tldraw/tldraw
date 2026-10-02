import { execFileSync } from 'child_process'
import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
/* eslint-disable no-console */
// Differential fuzzer: random rich text documents from tldraw's default schema, measured in one
// Chromium page by the DOM (the oracle) and by the engine on a browser canvas. Failures are
// shrunk to minimal cases and grouped by what they have in common.
//   pnpm exec tsx golden/fuzz.ts [--runs N] [--seed S] [--webkit]
import fc from 'fast-check'
import { launchOracle, type Oracle } from './browser/oracle'
import type { FuzzCase, FuzzResult } from './browser/page'

const argv = process.argv.slice(2)
const arg = (name: string, fallback: number) =>
	argv.includes(name) ? Number(argv[argv.indexOf(name) + 1]) : fallback
const RUNS = arg('--runs', 3000)
const SEED = arg('--seed', 42)
const browserName = argv.includes('--webkit') ? 'webkit' : 'chromium'

// The marks and nodes tldraw's default extensions can produce (blockquote and codeBlock are
// disabled in getTipTapDefaultExtensions).
const FORMAT_MARKS = ['bold', 'italic', 'strike', 'underline', 'highlight', 'link'] as const

const token = fc.oneof(
	{ weight: 10, arbitrary: fc.stringMatching(/^[A-Za-z][a-z]{0,9}$/) },
	{ weight: 2, arbitrary: fc.stringMatching(/^[A-Za-z]{20,60}$/) },
	{
		weight: 3,
		arbitrary: fc.constantFrom(
			',',
			'.',
			'!',
			'?',
			';',
			':',
			'—',
			'–',
			'-',
			'(',
			')',
			'"',
			"'",
			'…',
			'/',
			'•',
			'→'
		),
	},
	{ weight: 2, arbitrary: fc.integer({ min: 0, max: 99999 }).map(String) },
	{ weight: 1, arbitrary: fc.constant('https://example.com/some/path?x=1') },
	{ weight: 2, arbitrary: fc.constantFrom(' ', '  ', '   ', '\t') }
)

const text = fc
	.array(token, { minLength: 1, maxLength: 14 })
	.map((tokens) => tokens.join(' '))
	.filter((t) => t.length > 0)

const marks = fc.oneof(
	{ weight: 6, arbitrary: fc.constant([] as { type: string; attrs?: object }[]) },
	{ weight: 1, arbitrary: fc.constant([{ type: 'code' }]) },
	{
		weight: 3,
		arbitrary: fc
			.subarray([...FORMAT_MARKS], { minLength: 1 })
			.map((ms) =>
				ms.map((type) =>
					type === 'link' ? { type, attrs: { href: 'https://example.com' } } : { type }
				)
			),
	}
)

const textNode = fc.record({ text, marks }).map(({ text, marks }) => ({
	type: 'text',
	text,
	...(marks.length ? { marks } : {}),
}))

const inline = fc.array(
	fc.oneof(
		{ weight: 8, arbitrary: textNode },
		{ weight: 1, arbitrary: fc.constant({ type: 'hardBreak' }) }
	),
	{ minLength: 1, maxLength: 4 }
)

const paragraph = fc.oneof(
	{ weight: 12, arbitrary: inline.map((content) => ({ type: 'paragraph', content })) },
	{ weight: 1, arbitrary: fc.constant({ type: 'paragraph' }) }
)

const heading = fc
	.record({ level: fc.integer({ min: 1, max: 3 }), content: inline })
	.map(({ level, content }) => ({ type: 'heading', attrs: { level }, content }))

const list = fc.letrec((tie) => ({
	list: fc
		.record({
			type: fc.constantFrom('bulletList', 'orderedList'),
			items: fc.oneof(
				{ weight: 6, arbitrary: fc.array(tie('item'), { minLength: 1, maxLength: 4 }) },
				// 10+ items widen the ordered-list gutter
				{ weight: 1, arbitrary: fc.array(tie('item'), { minLength: 9, maxLength: 12 }) }
			),
		})
		.map(({ type, items }) => ({ type, content: items })),
	item: fc
		.record({
			p: paragraph,
			nested: fc.oneof(
				{ weight: 5, arbitrary: fc.constant(null) },
				{ weight: 1, arbitrary: tie('list') }
			),
		})
		.map(({ p, nested }) => ({ type: 'listItem', content: nested ? [p, nested] : [p] })),
}))

const doc = fc
	.array(
		fc.oneof(
			{ weight: 6, arbitrary: paragraph },
			{ weight: 2, arbitrary: heading },
			{ weight: 2, arbitrary: list.list }
		),
		{ minLength: 1, maxLength: 4, depthIdentifier: 'doc' }
	)
	.map((content) => normalize({ type: 'doc', content }))

/** ProseMirror merges adjacent text nodes with the same marks; documents never contain them. */
function normalize<T>(node: T): T {
	const n = node as any
	if (!n.content) return node
	const content: any[] = []
	for (const child of n.content.map(normalize)) {
		const prev = content[content.length - 1]
		if (
			prev?.type === 'text' &&
			child.type === 'text' &&
			JSON.stringify(prev.marks ?? []) === JSON.stringify(child.marks ?? [])
		) {
			content[content.length - 1] = { ...prev, text: prev.text + child.text }
		} else content.push(child)
	}
	return { ...n, content }
}

const FONTS = ['draw', 'sans', 'serif', 'mono'] as const

const textCase = fc.record({
	doc,
	font: fc.constantFrom(...FONTS),
	fontSize: fc.oneof(fc.constantFrom(18, 24, 36, 44), fc.integer({ min: 12, max: 60 })),
	width: fc.oneof(
		fc.constant(null),
		fc.integer({ min: 30, max: 700 }),
		fc.constant('boundary' as const)
	),
	delta: fc.double({ min: -2, max: 2, noNaN: true }),
	mode: fc.constant('text' as const),
})

// NoteShapeUtil: 200px note, 16px padding, 1px fuzz.
const noteCase = fc.record({
	doc,
	font: fc.constantFrom(...FONTS),
	// The shrink loop checks scrollWidth from the label size (18-32) down to 15.
	fontSize: fc.integer({ min: 15, max: 32 }),
	width: fc.constant(167),
	mode: fc.constant('note' as const),
})

const fuzzCase = fc.oneof(
	{ weight: 4, arbitrary: textCase },
	{ weight: 1, arbitrary: noteCase }
) as fc.Arbitrary<FuzzCase>

type FailureKind = 'lines' | 'wrap' | 'wide' | 'noteShrink'

function failures(c: FuzzCase, r: FuzzResult): FailureKind[] {
	const out: FailureKind[] = []
	const lineHeight = Math.round(c.fontSize * 1.35)
	if (Math.abs(r.native.h - r.dom.h) >= lineHeight * 0.45) out.push('lines')
	if (c.mode !== 'note' && r.maxWidth === null) {
		// Autosize text gets the measured width + 1; the DOM wraps if it needs more than that.
		if (r.dom.w > Math.max(16, r.native.w + 1)) out.push('wrap')
		if (r.native.w - r.dom.w > 1) out.push('wide')
	}
	if (c.mode === 'note') {
		const fits = (m: FuzzResult['dom']) => m.scrollWidth.toFixed(0) === m.w.toFixed(0)
		if (fits(r.dom) !== fits(r.native)) out.push('noteShrink')
	}
	return out
}

interface Node {
	type: string
	text?: string
	content?: Node[]
	marks?: any[]
	attrs?: any
}

function clone<T>(x: T): T {
	return JSON.parse(JSON.stringify(x))
}

interface Slot {
	node: Node
	replace(next: Node[]): Node
}

function* slots(root: Node): Generator<Slot> {
	function* walk(node: Node, path: number[]): Generator<Slot> {
		for (let i = 0; i < (node.content?.length ?? 0); i++) {
			const childPath = [...path, i]
			const child = node.content![i]
			yield {
				node: child,
				replace: (next) => {
					const copy = clone(root)
					let parent = copy
					for (const j of path) parent = parent.content![j]
					parent.content!.splice(i, 1, ...next)
					return copy
				},
			}
			yield* walk(child, childPath)
		}
	}
	yield* walk(root, [])
}

function isValid(doc: Node): boolean {
	if (!doc.content?.length) return false
	const ok = (n: Node): boolean => {
		if (n.type === 'listItem' && n.content?.[0]?.type !== 'paragraph') return false
		if ((n.type === 'bulletList' || n.type === 'orderedList') && !n.content?.length) return false
		if (n.type === 'text' && !n.text) return false
		return (n.content ?? []).every(ok)
	}
	return ok(doc)
}

function candidates(c: FuzzCase): FuzzCase[] {
	const out: FuzzCase[] = []
	const docRoot = c.doc as unknown as Node
	const push = (doc: Node) => {
		const next = normalize(doc)
		if (isValid(next)) out.push({ ...c, doc: next as any })
	}
	for (const { node, replace } of slots(docRoot)) {
		push(replace([]))
		if (node.type === 'heading') push(replace([{ ...node, type: 'paragraph', attrs: undefined }]))
		if (node.type === 'bulletList' || node.type === 'orderedList') {
			push(replace(node.content!.flatMap((item) => item.content ?? [])))
			if (node.type === 'orderedList') push(replace([{ ...node, type: 'bulletList' }]))
		}
		if (node.type === 'listItem' && node.content!.length > 1)
			push(replace([{ ...node, content: [node.content![0]] }]))
		if (node.type === 'text') {
			if (node.marks?.length) {
				push(replace([{ ...node, marks: undefined }]))
				for (let m = 0; m < node.marks.length; m++)
					push(replace([{ ...node, marks: node.marks.filter((_, j) => j !== m) }]))
			}
			const t = node.text!
			const parts = t.split(/(?<= )/)
			for (let p = 0; p < parts.length && parts.length > 1; p++)
				push(replace([{ ...node, text: parts.filter((_, j) => j !== p).join('') }]))
			if (t.length > 1) {
				push(replace([{ ...node, text: t.slice(0, Math.ceil(t.length / 2)) }]))
				push(replace([{ ...node, text: t.slice(Math.floor(t.length / 2)) }]))
			}
			if (t.length <= 80)
				for (let k = 0; k < t.length; k++)
					push(replace([{ ...node, text: t.slice(0, k) + t.slice(k + 1) }]))
		}
	}
	if (c.font !== 'sans') out.push({ ...c, font: 'sans' })
	if (c.fontSize !== 24 && c.mode !== 'note') out.push({ ...c, fontSize: 24 })
	if (c.width === 'boundary' && c.delta !== 0) out.push({ ...c, delta: 0 })
	return out
}

async function shrink(oracle: Oracle, start: FuzzCase, kind: FailureKind) {
	let current = start
	let result: FuzzResult | null = null
	for (let round = 0; round < 400; round++) {
		const cands = candidates(current)
		if (!cands.length) break
		let next: FuzzCase | null = null
		for (let i = 0; i < cands.length && !next; i += 300) {
			const batch = cands.slice(i, i + 300)
			const results = await oracle.measureCases(batch)
			const hit = results.findIndex((r, j) => failures(batch[j], r).includes(kind))
			if (hit >= 0) {
				next = batch[hit]
				result = results[hit]
			}
		}
		if (!next) break
		current = next
	}
	result ??= (await oracle.measureCases([current]))[0]
	return { case: current, result }
}

function signature(kind: FailureKind, c: FuzzCase) {
	const types = new Set<string>()
	const markTypes = new Set<string>()
	let text = ''
	const walk = (n: Node) => {
		if (n.type !== 'doc' && n.type !== 'text' && n.type !== 'paragraph')
			types.add(n.type === 'heading' ? `h${n.attrs?.level}` : n.type)
		n.marks?.forEach((m) => markTypes.add(m.type))
		if (n.text) text += n.text
		if (n.type === 'paragraph' || n.type === 'heading') text += '\n'
		n.content?.forEach(walk)
	}
	walk(c.doc as any)
	const blockLines = text.split('\n').filter((l, i, all) => i < all.length - 1 || l)
	const features = [
		blockLines.some((l) => /\S\s+$/.test(l)) && 'trailing-space',
		blockLines.some((l) => /^\s+\S/.test(l)) && 'leading-space',
		blockLines.some((l) => l.length > 0 && !/\S/.test(l)) && 'blank-line',
		/\t/.test(text) && 'tab',
		/\S {2,}\S/.test(text) && 'space-run',
		/[A-Za-z0-9]{20,}/.test(text) && 'long-word',
		/https?:/.test(text) && 'url',
		/[—–\-/…→•]/.test(text) && 'punct',
		blockLines.every((l) => !l) && 'empty',
	].filter(Boolean)
	const width =
		c.mode === 'note'
			? 'note'
			: c.width === null
				? 'max-content'
				: c.width === 'boundary'
					? 'boundary'
					: 'fixed'
	return [
		kind,
		width,
		[...types].sort().join('+') || 'p',
		[...markTypes].sort().join('+') || '-',
		features.join('+') || '-',
	].join(' | ')
}

function describe(c: FuzzCase, r: FuzzResult) {
	return {
		font: c.font,
		fontSize: c.fontSize,
		mode: c.mode,
		maxWidth: r.maxWidth,
		dom: r.dom,
		native: r.native,
		routing: r.routing,
		doc: c.doc,
	}
}

async function main() {
	const oracle = await launchOracle(browserName)
	const cases = fc.sample(fuzzCase, { numRuns: RUNS, seed: SEED })
	const failing: { kind: FailureKind; c: FuzzCase }[] = []
	const counts: Record<string, number> = {}
	for (let i = 0; i < cases.length; i += 200) {
		const batch = cases.slice(i, i + 200)
		const results = await oracle.measureCases(batch)
		results.forEach((r, j) => {
			for (const kind of failures(batch[j], r)) {
				counts[kind] = (counts[kind] ?? 0) + 1
				failing.push({ kind, c: batch[j] })
			}
		})
		console.log(
			`  ${Math.min(i + 200, cases.length)}/${cases.length}, failures so far: ${failing.length}`
		)
	}

	// Shrink a few per kind; distinct minimal signatures are what matter.
	const clusters = new Map<string, { count: number; example: ReturnType<typeof describe> }>()
	const perKind: Record<string, number> = {}
	for (const { kind, c } of failing) {
		if ((perKind[kind] = (perKind[kind] ?? 0) + 1) > 100) continue
		const { case: small, result } = await shrink(oracle, c, kind)
		const sig = signature(kind, small)
		const existing = clusters.get(sig)
		if (existing) existing.count++
		else clusters.set(sig, { count: 1, example: describe(small, result) })
	}
	await oracle.close()

	const lines = [
		`# Fuzz report (${browserName})`,
		'',
		`Seed ${SEED}, ${RUNS} cases. Failures by kind (a case can fail several ways):`,
		'',
		'| kind | cases | rate |',
		'| --- | --- | --- |',
		...Object.entries(counts).map(
			([k, n]) => `| ${k} | ${n} | ${((100 * n) / RUNS).toFixed(2)}% |`
		),
		'',
		'## Shrunk clusters',
		'',
		'Signature: kind | width mode | nodes | marks | text features. Up to 100 failures per kind were shrunk.',
		'',
		...[...clusters]
			.sort((a, b) => b[1].count - a[1].count)
			.flatMap(([sig, { count, example }]) => [
				`### ${sig} (${count})`,
				'',
				'```json',
				JSON.stringify(example),
				'```',
				'',
			]),
	]
	const out = join(dirname(fileURLToPath(import.meta.url)), `fuzz-report-${browserName}.md`)
	writeFileSync(out, lines.join('\n'))
	// The report is committed, so it has to pass the repo's format check as written.
	execFileSync('pnpm', ['exec', 'oxfmt', out], { stdio: 'ignore' })
	console.log(lines.slice(0, 12 + Object.keys(counts).length).join('\n'))
	console.log(`\n${clusters.size} clusters; full report in ${out}`)
}

await main()
