/* eslint-disable no-console */
// Loads every board in golden/boards/raw into a DOM-measured and an engine-measured editor in
// Chromium and compares the geometry and persisted values each would produce. Board contents stay
// in the gitignored boards/ directory; the report only carries aggregates and shape ids.
//   pnpm exec tsx golden/boards-run.ts [--webkit] [--limit N]
import { createHash } from 'crypto'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { launchOracle } from './browser/oracle'
import type { BoardShapeResult } from './browser/page'

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'boards')
const argv = process.argv.slice(2)
const browserName = argv.includes('--webkit') ? 'webkit' : 'chromium'
const limit = argv.includes('--limit') ? Number(argv[argv.indexOf('--limit') + 1]) : Infinity

/** Fixed split by board, so near-identical text from one board never lands on both sides. */
function splitOf(board: string): 'train' | 'test' {
	return createHash('sha1').update(board).digest()[0] % 10 < 7 ? 'train' : 'test'
}

const LINE_HEIGHTS: Record<string, number> = { s: 18, m: 24, l: 36, xl: 44 }

interface Row extends BoardShapeResult {
	board: string
	split: 'train' | 'test'
	/** Autosize text whose DOM rendering would no longer fit the engine's width and wrap. */
	wrapRisk: boolean
	/** Height differs by at least half a line: the engine broke lines differently. */
	lineMismatch: boolean
	/** A persisted value (growY, fontSizeAdjustment) would be written differently. */
	persistedMismatch: boolean
	dw: number
	dh: number
}

function classify(board: string, r: BoardShapeResult): Row {
	// Text geometry is scaled; thresholds are in unscaled pixels.
	const scale = r.type === 'text' ? r.scale : 1
	const dw = (r.native.w - r.dom.w) / scale
	const dh = (r.native.h - r.dom.h) / scale
	const halfLine = (Math.round((LINE_HEIGHTS[r.size] ?? 24) * 1.35) / 2) * 0.9
	const labelDh = (r.native.labelH ?? 0) - (r.dom.labelH ?? 0)
	return {
		...r,
		board,
		split: splitOf(board),
		dw,
		dh,
		wrapRisk: r.type === 'text' && r.autoSize === true && -dw > 1,
		lineMismatch: Math.abs(dh) >= halfLine || Math.abs(labelDh) >= halfLine,
		persistedMismatch:
			Math.abs((r.native.growY ?? 0) - (r.dom.growY ?? 0)) > 0.5 ||
			(r.native.fontSizeAdjustment ?? 1) !== (r.dom.fontSizeAdjustment ?? 1),
	}
}

function pct(n: number, d: number) {
	return d === 0 ? '-' : `${((100 * n) / d).toFixed(2)}%`
}

function summarize(rows: Row[]) {
	const lines: string[] = []
	const table = (title: string, subset: Row[], key: (r: Row) => string) => {
		lines.push(`### ${title}`, '')
		lines.push('| group | shapes | wrap risk | line mismatch | persisted mismatch | p99 abs dw |')
		lines.push('| --- | --- | --- | --- | --- | --- |')
		const groups = new Map<string, Row[]>()
		for (const r of subset) {
			const k = key(r)
			if (!groups.has(k)) groups.set(k, [])
			groups.get(k)!.push(r)
		}
		for (const [k, g] of [...groups].sort()) {
			const dws = g.map((r) => Math.abs(r.dw)).sort((a, b) => a - b)
			const p99 = dws[Math.min(dws.length - 1, Math.floor(dws.length * 0.99))] ?? 0
			const wrap = g.filter((r) => r.wrapRisk).length
			const mismatched = g.filter((r) => r.lineMismatch).length
			const persisted = g.filter((r) => r.persistedMismatch).length
			lines.push(
				`| ${k} | ${g.length} | ${wrap} (${pct(wrap, g.length)}) | ${mismatched} (${pct(mismatched, g.length)}) | ${persisted} | ${p99.toFixed(2)} |`
			)
		}
		lines.push('')
	}
	table('By routing and split', rows, (r) => `${r.routing} / ${r.split}`)
	const native = rows.filter((r) => r.routing === 'native')
	lines.push('Rows below are shapes the default measurer would lay out natively.', '')
	table(
		'Native-routed, by shape type',
		native,
		(r) => r.type + (r.type === 'text' ? (r.autoSize ? ' (auto)' : ' (fixed)') : '')
	)
	table('Native-routed, by font', native, (r) => r.font)
	table('Native-routed, by size', native, (r) => r.size)
	return lines.join('\n')
}

async function main() {
	const files = readdirSync(join(DIR, 'raw')).slice(0, limit)
	const oracle = await launchOracle(browserName)
	const rows: Row[] = []
	const errors: string[] = []
	let i = 0
	for (const file of files) {
		const board = file.replace(/\.json$/, '')
		const snapshot = JSON.parse(readFileSync(join(DIR, 'raw', file), 'utf8'))
		const { results, error } = await oracle.measureBoard(snapshot)
		if (error) errors.push(`${board}: ${error}`)
		for (const r of results) rows.push(classify(board, r))
		console.log(
			`  ${++i}/${files.length} ${board}: ${results.length} shapes${error ? ' ERROR' : ''}`
		)
	}
	await oracle.close()
	writeFileSync(join(DIR, `results-${browserName}.json`), JSON.stringify(rows))
	const report = [
		`# Board corpus: DOM vs engine (${browserName})`,
		'',
		`Boards: ${files.length}, shapes: ${rows.length}, load errors: ${errors.length}`,
		'',
		summarize(rows),
		errors.length ? `## Load errors\n\n${errors.map((e) => `- ${e}`).join('\n')}\n` : '',
	].join('\n')
	writeFileSync(join(DIR, `report-${browserName}.md`), report)
	console.log(report)
}

await main()
