/* eslint-disable no-console */
// Golden drift harness. Usage (from the package directory):
//   yarn golden            compare plain-text corpus
//   yarn golden --rich     compare the rich-text corpus too (needs the tldraw adapter)
//   yarn golden --pixels   rasterize the native svg (Chromium and resvg) against foreignObject
//   yarn golden --refresh  re-measure in Chromium instead of using cached results
//   yarn golden --dump     write the per-case rows to results/rows.json for inspection
//   yarn golden --webkit   measure against WebKit instead of Chromium
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { ChromiumRequest, ChromiumResult, measureInChromium, plainTextToHtml } from './chromium'
import { plainCorpus, richCorpus } from './corpus'
import { EngineResult, installTldrawFonts, measurePlainInEngine } from './engine'

const RESULTS_DIR = join(__dirname, 'results')
const args = new Set(process.argv.slice(2))
const browserName = args.has('--webkit') ? 'webkit' : 'chromium'

interface Row {
	id: string
	chrome: ChromiumResult
	engine: EngineResult
	dw: number
	dh: number
	lineMismatch: boolean
}

function percentile(values: number[], p: number) {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
	return sorted[Math.max(0, idx)]
}

async function chromiumResults(
	name: string,
	requests: ChromiumRequest[]
): Promise<Map<string, ChromiumResult>> {
	mkdirSync(RESULTS_DIR, { recursive: true })
	const hash = createHash('sha1').update(JSON.stringify(requests)).digest('hex').slice(0, 12)
	const file = join(RESULTS_DIR, `${browserName}-${name}-${hash}.json`)
	let results: ChromiumResult[]
	if (existsSync(file) && !args.has('--refresh')) {
		results = JSON.parse(readFileSync(file, 'utf8'))
	} else {
		console.log(`Measuring ${requests.length} ${name} cases in ${browserName}...`)
		results = await measureInChromium(requests, browserName)
		writeFileSync(file, JSON.stringify(results))
	}
	return new Map(results.map((r) => [r.id, r]))
}

function summarize(title: string, rows: Row[], groupBy: (row: Row) => string) {
	const lines: string[] = []
	lines.push(`## ${title}`, '')
	lines.push(`Cases: ${rows.length}`, '')
	const table = (label: string, subset: Row[]) => {
		const dws = subset.map((r) => Math.abs(r.dw))
		const dhs = subset.map((r) => Math.abs(r.dh))
		const mismatches = subset.filter((r) => r.lineMismatch).length
		return `| ${label} | ${subset.length} | ${Math.max(0, ...dws).toFixed(2)} | ${percentile(dws, 95).toFixed(2)} | ${Math.max(0, ...dhs).toFixed(2)} | ${percentile(dhs, 95).toFixed(2)} | ${mismatches} |`
	}
	lines.push('| group | cases | max dw | p95 dw | max dh | p95 dh | line mismatches |')
	lines.push('| --- | --- | --- | --- | --- | --- | --- |')
	lines.push(table('all', rows))
	const groups = new Map<string, Row[]>()
	for (const row of rows) {
		const key = groupBy(row)
		if (!groups.has(key)) groups.set(key, [])
		groups.get(key)!.push(row)
	}
	for (const [key, subset] of [...groups].sort()) lines.push(table(key, subset))
	lines.push('')
	lines.push('### Worst 10 cases', '')
	lines.push('| case | chrome w×h (lines) | engine w×h (lines) | dw | dh |')
	lines.push('| --- | --- | --- | --- | --- |')
	const worst = [...rows]
		.sort((a, b) => Math.abs(b.dw) + Math.abs(b.dh) - (Math.abs(a.dw) + Math.abs(a.dh)))
		.slice(0, 10)
	for (const r of worst) {
		lines.push(
			`| ${r.id} | ${r.chrome.w.toFixed(2)}×${r.chrome.h.toFixed(2)} (${r.chrome.lines}) | ${r.engine.w.toFixed(2)}×${r.engine.h.toFixed(2)} (${r.engine.lines}) | ${r.dw.toFixed(2)} | ${r.dh.toFixed(2)} |`
		)
	}
	lines.push('')
	const mismatched = rows.filter((r) => r.lineMismatch)
	if (mismatched.length) {
		lines.push(`### Line-count mismatches (${mismatched.length})`, '')
		for (const r of mismatched.slice(0, 40)) {
			lines.push(`- ${r.id}: chrome ${r.chrome.lines}, engine ${r.engine.lines}`)
		}
		lines.push('')
	}
	return lines.join('\n')
}

function compare(
	cases: { id: string }[],
	chrome: Map<string, ChromiumResult>,
	engine: Map<string, EngineResult>
): Row[] {
	const rows: Row[] = []
	for (const c of cases) {
		const a = chrome.get(c.id)
		const b = engine.get(c.id)
		if (!a || !b) continue
		rows.push({
			id: c.id,
			chrome: a,
			engine: b,
			dw: b.w - a.w,
			dh: b.h - a.h,
			lineMismatch: a.lines !== b.lines,
		})
	}
	return rows
}

async function main() {
	await installTldrawFonts()
	const report: string[] = [
		'# Golden drift report',
		'',
		`Generated ${new Date().toISOString()}`,
		'',
	]

	const plain = plainCorpus()
	const chrome = await chromiumResults(
		'plain',
		plain.map((c) => ({
			id: c.id,
			html: plainTextToHtml(c.text),
			family: c.family,
			fontSize: c.fontSize,
			maxWidth: c.maxWidth,
		}))
	)
	const engine = new Map<string, EngineResult>()
	for (const c of plain) engine.set(c.id, measurePlainInEngine(c))
	const rows = compare(plain, chrome, engine)
	report.push(summarize('Plain text', rows, (r) => r.id.split('/')[1]))
	report.push(summarize('Plain text by case', rows, (r) => r.id.split('/')[0]))

	// --- rich text (needs the tldraw adapter; loaded lazily so the plain run works on its own)
	if (args.has('--rich')) {
		const { measureRichInEngine, richCaseToHtml } = await import('./rich')
		const rich = richCorpus()
		const chromeRich = await chromiumResults(
			'rich',
			rich.map((c) => ({
				id: c.id,
				html: richCaseToHtml(c),
				family: c.family,
				fontSize: c.fontSize,
				maxWidth: c.maxWidth,
				otherStyles: { 'text-align': c.textAlign },
			}))
		)
		const engineRich = new Map<string, EngineResult>()
		for (const c of rich) engineRich.set(c.id, measureRichInEngine(c))
		const richRows = compare(rich, chromeRich, engineRich)
		report.push(summarize('Rich text', richRows, (r) => r.id.split('/')[1]))
		report.push(summarize('Rich text by document', richRows, (r) => r.id.split('/')[0]))
	}

	// --- pixel comparison of the native svg renderer (rich corpus, sans + draw)
	if (args.has('--pixels')) {
		const { layoutRichCase, richCaseToHtml } = await import('./rich')
		const { comparePixels } = await import('./pixels')
		const { renderSvg } = await import('../src/render/svg')
		const rich = richCorpus().filter((c) => !/cjk|rtl|emoji/.test(c.docKey))
		const cases = rich.map((c) => {
			// The reference box is whole pixels wide (a shape's bounds); align inside the same box
			// so centred/end-aligned lines aren't shifted by the fractional max-content width.
			const measured = layoutRichCase(c)
			const layout = layoutRichCase(c, { width: Math.ceil(measured.width) })
			return {
				id: c.id,
				docKey: c.docKey,
				family: c.family,
				fontSize: c.fontSize,
				maxWidth: c.maxWidth,
				textAlign: c.textAlign,
				html: richCaseToHtml(c),
				engine: {
					id: c.id,
					w: layout.width,
					h: layout.height,
					lines: layout.lines.length,
					lineTops: layout.lines.map((l) => l.y),
					svg: renderSvg(layout),
				},
			}
		})
		console.log(`Rasterizing ${cases.length} cases...`)
		const results = await comparePixels(cases)
		const pct = (v: number) => `${(v * 100).toFixed(2)}%`
		const lines: string[] = [
			'## Native SVG pixel diff',
			'',
			`Cases: ${results.length}. Differing pixels as a share of the box, luminance threshold 48/255.`,
			'',
		]
		lines.push('| renderer | max | p95 | median |', '| --- | --- | --- | --- |')
		for (const key of ['chromiumDiff', 'resvgDiff'] as const) {
			const values = results.map((r) => r[key])
			lines.push(
				`| ${key === 'chromiumDiff' ? 'Chromium (native svg vs foreignObject)' : 'resvg (native svg vs Chromium foreignObject)'} | ${pct(Math.max(...values))} | ${pct(percentile(values, 95))} | ${pct(percentile(values, 50))} |`
			)
		}
		lines.push(
			'',
			'### Worst 10 (resvg)',
			'',
			'| case | size | chromium | resvg |',
			'| --- | --- | --- | --- |'
		)
		for (const r of [...results].sort((a, b) => b.resvgDiff - a.resvgDiff).slice(0, 10)) {
			lines.push(
				`| ${r.id} | ${r.width}×${r.height} | ${pct(r.chromiumDiff)} | ${pct(r.resvgDiff)} |`
			)
		}
		lines.push('')
		report.push(lines.join('\n'))
	}

	const text = report.join('\n')
	writeFileSync(join(__dirname, browserName === 'webkit' ? 'report-webkit.md' : 'report.md'), text)
	console.log(text)
	if (args.has('--dump')) {
		writeFileSync(join(RESULTS_DIR, 'rows.json'), JSON.stringify(rows, null, 1))
	}
}

main().then(
	// the tldraw modules loaded for the rich corpus keep a jsdom window alive; exit explicitly
	() => process.exit(0),
	(err) => {
		console.error(err)
		process.exit(1)
	}
)
