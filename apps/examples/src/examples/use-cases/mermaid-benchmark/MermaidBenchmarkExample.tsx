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
	firstLoad?: { pele: FirstLoad; mermaid: FirstLoad }
	engine: { type: string; pele: number; mermaid: number }[]
	paste: { type: string; ms: number }[]
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
async function measureFirstLoad(run: () => Promise<unknown>): Promise<FirstLoad> {
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

async function loadMermaid(text: string) {
	const { default: mermaid } = await import('mermaid')
	// [4]
	mermaid.initialize(
		/^\s*mindmap/.test(text)
			? { startOnLoad: false }
			: { startOnLoad: false, layout: 'dagre', state: { layout: 'dagre' } }
	)
	return mermaid
}

let nextMermaidId = 0

async function mermaidLayout(text: string) {
	const mermaid = await loadMermaid(text)
	const container = document.createElement('div')
	container.style.cssText = 'position:absolute;left:-9999px;top:-9999px'
	document.body.appendChild(container)
	try {
		await mermaid.render(`benchmark-${nextMermaidId++}`, text, container)
	} finally {
		container.remove()
	}
}

async function peleLayout(text: string) {
	const { renderAsync } = await import('pele/lazy')
	await renderAsync(text)
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
	return medianOf(times)
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
		const next: Results = { engine: [], paste: [] }
		const firstDiagram = mermaidDefinitions[0][0]

		// [3]
		if (!firstLoadMeasured) {
			firstLoadMeasured = true
			setStatus('Measuring first load…')
			next.firstLoad = {
				pele: await measureFirstLoad(() => peleLayout(firstDiagram)),
				mermaid: await measureFirstLoad(() => mermaidLayout(firstDiagram)),
			}
		}

		for (const [group, type] of TYPES.entries()) {
			setStatus(`Timing ${type.toLowerCase()} diagrams…`)
			const pele: number[] = []
			const mermaid: number[] = []
			const paste: number[] = []
			for (const text of mermaidDefinitions[group]) {
				pele.push(await median(() => peleLayout(text)))
				mermaid.push(await median(() => mermaidLayout(text)))
				paste.push(await median(() => pelePaste(editor, text)))
			}
			next.engine.push({ type, pele: medianOf(pele), mermaid: medianOf(mermaid) })
			next.paste.push({ type, ms: medianOf(paste) })
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
			{results && <ResultsTables results={results} />}
		</div>
	)
}

const ms = (value: number) =>
	value < 0.1 ? '< 0.1 ms' : `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`

function download({ transferKb, decodedKb }: FirstLoad) {
	if (transferKb < 1 && decodedKb > 0) return `cached (${Math.round(decodedKb)} KB)`
	return `${Math.round(transferKb)} KB (${Math.round(decodedKb)} KB unpacked)`
}

function ResultsTables({ results }: { results: Results }) {
	const { firstLoad, engine, paste } = results
	return (
		<div className="mermaid-benchmark__results">
			<table>
				<caption>Layout engine: same diagrams to SVG, no tldraw shapes</caption>
				<thead>
					<tr>
						<th />
						<th>Pele</th>
						<th>Mermaid</th>
					</tr>
				</thead>
				<tbody>
					{firstLoad && (
						<>
							<tr>
								<th>First load, time</th>
								<td>{ms(firstLoad.pele.ms)}</td>
								<td>{ms(firstLoad.mermaid.ms)}</td>
							</tr>
							<tr>
								<th>First load, downloaded</th>
								<td>{download(firstLoad.pele)}</td>
								<td>{download(firstLoad.mermaid)}</td>
							</tr>
						</>
					)}
					{engine.map((row) => (
						<tr key={row.type}>
							<th>{row.type}, median</th>
							<td>{ms(row.pele)}</td>
							<td>{ms(row.mermaid)}</td>
						</tr>
					))}
				</tbody>
			</table>
			<table>
				<caption>Pasting into tldraw with pele: layout + shapes</caption>
				<thead>
					<tr>
						<th />
						<th>Median</th>
					</tr>
				</thead>
				<tbody>
					{paste.map((row) => (
						<tr key={row.type}>
							<th>{row.type}</th>
							<td>{ms(row.ms)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

/*
[1]
Loading an engine's code happens once per page load. Later runs skip the first-load measurement
rather than report a warm number as a cold one; reload the page to measure it again.

[2]
Resource timings list every file fetched while the run was going. `transferSize` is what came
over the network (compressed, and zero when the browser cache served it); `decodedBodySize` is
the code's size once unpacked.

[3]
Each engine's first load is the download and start-up of its code plus laying out one flowchart,
so the two are measured the same way. A paste's first load adds this package's own code on top
of pele's.

[4]
Mermaid 12 lays diagrams out with ELK by default, which alone is a 2.5 MB download. Dagre, its
older layout and the one mermaid 11 used, ships with it too, and only the layout in use is
downloaded, so this keeps mermaid to the smaller of the two. Mindmaps are left alone: they use
their own cytoscape layout unless a layout is set, and setting one would switch them to dagre.
*/
