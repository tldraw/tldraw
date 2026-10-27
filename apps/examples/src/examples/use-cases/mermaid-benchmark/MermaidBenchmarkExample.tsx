import { useCallback, useState } from 'react'
import { Editor, TLComponents, Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import mermaidDefinitions from '../hundred-mermaids/mermaids'
import './mermaid-benchmark.css'

const TYPES = ['Flowchart', 'State', 'Sequence', 'Mindmap']
const WARM_REPEATS = 3

interface FirstLoad {
	ms: number
	transferKb: number
	decodedKb: number
}

interface Results {
	firstLoad?: { pelePaste: FirstLoad; mermaidEngine: FirstLoad }
	warm: { type: string; pelePaste: number; peleEngine: number; mermaidEngine: number }[]
}

const components: TLComponents = {
	TopPanel: BenchmarkPanel,
}

export default function MermaidBenchmarkExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

// [1]
let firstLoadMeasured = false

// [2]
async function measureFirstLoad<T>(run: () => Promise<T>): Promise<FirstLoad> {
	const start = performance.now()
	await run()
	const ms = performance.now() - start
	const loaded = performance
		.getEntriesByType('resource')
		.filter((entry) => entry.startTime >= start) as PerformanceResourceTiming[]
	const sum = (key: 'transferSize' | 'decodedBodySize') =>
		loaded.reduce((total, entry) => total + entry[key], 0) / 1024
	return { ms, transferKb: sum('transferSize'), decodedKb: sum('decodedBodySize') }
}

async function loadMermaid() {
	const { default: mermaid } = await import('mermaid')
	mermaid.initialize({ startOnLoad: false })
	return mermaid
}

let nextMermaidId = 0

async function mermaidEngine(mermaid: Awaited<ReturnType<typeof loadMermaid>>, text: string) {
	const container = document.createElement('div')
	container.style.cssText = 'position:absolute;left:-9999px;top:-9999px'
	document.body.appendChild(container)
	try {
		await mermaid.render(`benchmark-${nextMermaidId++}`, text, container)
	} finally {
		container.remove()
	}
}

async function pelePaste(editor: Editor, text: string) {
	const { createMermaidDiagram } = await import('@tldraw/mermaid')
	editor.deleteShapes([...editor.getCurrentPageShapeIds()])
	await createMermaidDiagram(editor, text, {
		blueprintRender: { position: { x: 0, y: 0 }, centerOnPosition: false },
	})
}

async function median(run: () => Promise<unknown>) {
	const times: number[] = []
	for (let i = 0; i < WARM_REPEATS; i++) {
		const start = performance.now()
		await run()
		times.push(performance.now() - start)
	}
	return times.sort((a, b) => a - b)[Math.floor(times.length / 2)]
}

function medianOf(values: number[]) {
	const sorted = [...values].sort((a, b) => a - b)
	return sorted[Math.floor(sorted.length / 2)]
}

function BenchmarkPanel() {
	const editor = useEditor()
	const [status, setStatus] = useState('')
	const [results, setResults] = useState<Results | null>(null)

	const run = useCallback(async () => {
		const next: Results = { warm: [] }
		const firstDiagram = mermaidDefinitions[0][0]

		// [3]
		if (!firstLoadMeasured) {
			firstLoadMeasured = true
			setStatus('Measuring first load…')
			const pelePasteLoad = await measureFirstLoad(() => pelePaste(editor, firstDiagram))
			const mermaidLoad = await measureFirstLoad(async () =>
				mermaidEngine(await loadMermaid(), firstDiagram)
			)
			next.firstLoad = { pelePaste: pelePasteLoad, mermaidEngine: mermaidLoad }
		}

		const mermaid = await loadMermaid()
		const { renderAsync } = await import('pele/lazy')
		for (const [group, type] of TYPES.entries()) {
			setStatus(`Timing ${type.toLowerCase()} diagrams…`)
			const paste: number[] = []
			const peleEngine: number[] = []
			const mermaidLayout: number[] = []
			for (const text of mermaidDefinitions[group]) {
				paste.push(await median(() => pelePaste(editor, text)))
				peleEngine.push(await median(() => renderAsync(text)))
				mermaidLayout.push(await median(() => mermaidEngine(mermaid, text)))
			}
			next.warm.push({
				type,
				pelePaste: medianOf(paste),
				peleEngine: medianOf(peleEngine),
				mermaidEngine: medianOf(mermaidLayout),
			})
		}

		editor.deleteShapes([...editor.getCurrentPageShapeIds()])
		setResults((previous) => ({ ...next, firstLoad: next.firstLoad ?? previous?.firstLoad }))
		setStatus('')
	}, [editor])

	return (
		<div className="mermaid-benchmark">
			<TldrawUiButton type="normal" onClick={run} disabled={!!status}>
				{status || 'Run benchmark'}
			</TldrawUiButton>
			{results && <ResultsTable results={results} />}
		</div>
	)
}

const ms = (value: number) =>
	value < 0.1 ? '< 0.1 ms' : `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`
const kb = (value: number) => `${Math.round(value)} KB`

function ResultsTable({ results }: { results: Results }) {
	const { firstLoad, warm } = results
	return (
		<div className="mermaid-benchmark__results">
			{firstLoad && (
				<table>
					<caption>First load (reload the page to measure again)</caption>
					<thead>
						<tr>
							<th />
							<th>Time</th>
							<th>Transferred</th>
							<th>Decoded</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<th>Pele paste</th>
							<td>{ms(firstLoad.pelePaste.ms)}</td>
							<td>{kb(firstLoad.pelePaste.transferKb)}</td>
							<td>{kb(firstLoad.pelePaste.decodedKb)}</td>
						</tr>
						<tr>
							<th>Mermaid engine only</th>
							<td>{ms(firstLoad.mermaidEngine.ms)}</td>
							<td>{kb(firstLoad.mermaidEngine.transferKb)}</td>
							<td>{kb(firstLoad.mermaidEngine.decodedKb)}</td>
						</tr>
					</tbody>
				</table>
			)}
			<table>
				<caption>Warm, median per diagram</caption>
				<thead>
					<tr>
						<th />
						<th>Pele paste</th>
						<th>Pele engine</th>
						<th>Mermaid engine</th>
					</tr>
				</thead>
				<tbody>
					{warm.map((row) => (
						<tr key={row.type}>
							<th>{row.type}</th>
							<td>{ms(row.pelePaste)}</td>
							<td>{ms(row.peleEngine)}</td>
							<td>{ms(row.mermaidEngine)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

/*
[1]
The first paste downloads and starts up the code it needs, which only happens once per page
load. Later runs skip the first-load measurement rather than report a warm number as a cold one.

[2]
Resource timings list every file fetched while the run was going. `transferSize` is what came
over the network (compressed, and zero for the browser cache); `decodedBodySize` is the code's
size once unpacked.

[3]
Pele's paste is measured first, on a flowchart, so it loads pele's core and its flowchart
code. Mermaid is then timed loading and laying out the same flowchart to SVG, which is only
the engine's share of a paste: it creates no tldraw shapes.
*/
