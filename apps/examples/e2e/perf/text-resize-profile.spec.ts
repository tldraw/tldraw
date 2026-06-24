import { writeFileSync } from 'fs'
import test from '@playwright/test'
import { Editor } from 'tldraw'
import { setup } from '../shared-e2e'

declare const editor: Editor

// End-to-end CPU profile of the text-measurement cost during a real resize, as opposed to the
// `text-measurement-perf` microbenchmark which times the measurement calls in isolation. This
// mimics what a user actually does: lay down a fleet of text shapes, select them all, and drag a
// resize handle around for a few seconds. Every pointer move resizes all selected shapes, which
// invalidates their geometry, re-measures the text (the path the cursive/RTL ink fix touches) and
// re-renders — so the V8 sampling profiler captures where the frame time really goes, through the
// full pointer -> resize -> measure -> layout -> React pipeline.
//
// Run with `yarn e2e-perf`. It prints a self-time-by-function table plus named buckets, and writes
// the summary (perf-<label>.json) and the raw .cpuprofile (loadable in the devtools Performance
// panel) as test artifacts. PERF_N / PERF_MOVES / PERF_LABEL tune the run; to compare a change, run
// it on each side (e.g. PERF_LABEL=before vs PERF_LABEL=after) and diff the summaries.

const N = Number(process.env.PERF_N || 300)
// Fixed number of resize steps (not a fixed duration): each step fully renders before the next, so
// before/after do identical work and the comparison isn't confounded by the faster arm doing more
// moves in the same wall-clock window.
const MOVES = Number(process.env.PERF_MOVES || 60)
const LABEL = process.env.PERF_LABEL || 'run'
// V8 sampling interval in microseconds. Finer = better attribution at a little more overhead.
const SAMPLE_US = Number(process.env.PERF_SAMPLE_US || 120)

interface ProfileNode {
	id: number
	hitCount?: number
	callFrame: { functionName: string; url: string; lineNumber: number }
	children?: number[]
}
interface CpuProfile {
	nodes: ProfileNode[]
	samples: number[]
	timeDeltas: number[]
	startTime: number
	endTime: number
}

test.describe('text resize CPU profile', () => {
	test.beforeEach(setup)
	test.setTimeout(180_000)

	test('profile resizing many text shapes', async ({ page }, testInfo) => {
		// The CPU profile comes from the Chrome DevTools Protocol, so this only runs on desktop
		// chromium (the mobile project's touch emulation also resizes differently).
		test.skip(testInfo.project.name !== 'chromium', 'CPU profiling bench runs on desktop chromium')

		// 1. Lay out a grid of text shapes — half plain LTR (the fast path) and half RTL/cursive
		//    (the path the fix adds the ink measurement to) — then frame them in the viewport.
		const info = await page.evaluate(async (n) => {
			const ed = editor as any
			ed.selectAll().deleteShapes(ed.getSelectedShapeIds())
			const SAMPLES = [
				{ text: 'The quick brown fox', font: 'sans' }, // LTR latin
				{ text: 'Hello world today', font: 'draw' }, // LTR
				{ text: 'مرحباً بكم في تلدرو', font: 'draw' }, // RTL Arabic (cursive)
				{ text: 'שלום עולם כיתוב חדש', font: 'draw' }, // RTL Hebrew
			]
			const cols = Math.ceil(Math.sqrt(n))
			const shapes = []
			for (let i = 0; i < n; i++) {
				const s = SAMPLES[i % SAMPLES.length]
				shapes.push({
					id: `shape:perf${i}`,
					type: 'text',
					x: (i % cols) * 260,
					y: Math.floor(i / cols) * 90,
					props: {
						richText: {
							type: 'doc',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: s.text }] }],
						},
						font: s.font,
						size: 'm',
						autoSize: true,
						color: 'black',
					},
				})
			}
			ed.createShapes(shapes)
			await ed.fonts.loadRequiredFontsForCurrentPage()
			await ed.getContainerDocument().fonts.ready
			ed.selectAll()

			// Frame the whole grid into the viewport with a margin, so the bottom-right resize handle
			// sits comfortably on-screen and clickable.
			const gb = ed.getSelectionPageBounds()
			const vsb = ed.getViewportScreenBounds()
			const margin = 130
			const z = Math.max(0.05, Math.min((vsb.w - margin * 2) / gb.w, (vsb.h - margin * 2) / gb.h))
			ed.setCamera(
				{ x: vsb.x / z + margin / z - gb.minX, y: vsb.y / z + margin / z - gb.minY, z },
				{ immediate: true }
			)
			await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

			const b = ed.getSelectionPageBounds()
			const corner = ed.pageToScreen({ x: b.maxX, y: b.maxY })
			const center = ed.pageToScreen({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 })
			return {
				count: ed.getSelectedShapeIds().length,
				corner: { x: corner.x, y: corner.y },
				center: { x: center.x, y: center.y },
				viewport: { w: vsb.w, h: vsb.h },
				zoom: z,
			}
		}, N)

		if (info.count !== N) throw new Error(`expected ${N} selected, got ${info.count}`)

		// 2. Grab the bottom-right resize handle with a real pointer press and confirm we actually
		//    entered the resize interaction (the handle is hit-tested off the pointer position; there
		//    is no DOM element to target).
		await page.mouse.move(info.corner.x, info.corner.y)
		await page.mouse.down()
		await page.mouse.move(info.corner.x - 6, info.corner.y - 6) // nudge past the drag threshold
		const path = await page.evaluate(() => (editor as any).getPath())
		if (!/resizing|resize_handle/.test(path)) {
			await page.mouse.up()
			throw new Error(`did not grab a resize handle (editor state: ${path})`)
		}

		// 3. Profile while we sweep the handle between its start and the selection centre (plus a
		//    wobble). Each step moves the handle then waits for the resulting resize to render, so a
		//    "move" is one full pointer -> resize -> re-measure -> re-render cycle.
		const client = await page.context().newCDPSession(page)
		await client.send('Profiler.enable')
		await client.send('Profiler.setSamplingInterval', { interval: SAMPLE_US })
		await client.send('Profiler.start')

		const { corner, center, viewport } = info
		const clamp = (v: number, hi: number) => Math.max(6, Math.min(hi - 6, v))
		let moves = 0
		for (let m = 0; m < MOVES; m++) {
			const t = m / 6 // pseudo-seconds, deterministic across runs
			const u = (Math.sin(t * Math.PI) + 1) / 2 // 0..1 at 0.5 Hz
			const x = corner.x + (center.x - corner.x) * u * 0.85 + Math.sin(t * 7) * 28
			const y = corner.y + (center.y - corner.y) * u * 0.85 + Math.cos(t * 6) * 28
			await page.mouse.move(clamp(x, viewport.w), clamp(y, viewport.h))
			moves++
			// Let this resize fully commit before the next step (self-paces to the frame cost).
			await page.evaluate(
				() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
			)
		}
		await page.mouse.up()

		const { profile } = (await client.send('Profiler.stop')) as { profile: CpuProfile }
		await client.detach()

		// 4. Attribute each sample's elapsed time to the function it was executing (self time).
		const byId = new Map(profile.nodes.map((nd) => [nd.id, nd]))
		const fnKey = (nd: ProfileNode) => {
			const f = nd.callFrame
			const name = f.functionName || '(anonymous)'
			const file = (f.url || '').split('/').pop()?.split('?')[0] || ''
			return file ? `${name}  (${file}:${f.lineNumber + 1})` : name
		}
		const selfUs = new Map<string, number>()
		let totalUs = 0
		for (let i = 0; i < profile.samples.length; i++) {
			const dt = profile.timeDeltas[i] || 0
			if (dt < 0) continue
			totalUs += dt
			const nd = byId.get(profile.samples[i])
			if (!nd) continue
			const k = fnKey(nd)
			selfUs.set(k, (selfUs.get(k) || 0) + dt)
		}
		const rows = [...selfUs.entries()].sort((a, b) => b[1] - a[1])
		const ms = (us: number) => +(us / 1000).toFixed(1)
		const pct = (us: number) => +((100 * us) / totalUs).toFixed(1)
		const bucket = (re: RegExp) => rows.filter(([k]) => re.test(k)).reduce((s, [, us]) => s + us, 0)

		const idleUs = bucket(/\(idle\)|\(program\)|\(garbage/i)
		// Buckets are keyed off the source file (kept disjoint so percentages add up). textMeasure is
		// the measurement JS in TextManager (incl. the fix's ink pass); layout is the synchronous
		// reflow that the advance measurement forces; react/signals are the render/reactivity cost.
		const buckets = {
			textMeasure: bucket(/TextManager\.ts|measureHtml\b|measureText\b|measureWord/),
			geometry: bucket(/TextShapeUtil\.tsx|getGeometry|Geometry2d|Rectangle2d/),
			layout: bucket(/getBoundingClientRect|getClientRects|getComputedStyle|getBBox/),
			react: bucket(/react-dom_client\.js|react_jsx|ReactElement|jsxDEV/),
			signals: bucket(/Computed\.ts|Atom\.ts|capture\.ts|EffectScheduler|transactions\.ts/),
		}

		const busyUs = totalUs - idleUs
		const summary = {
			label: LABEL,
			shapes: N,
			moves,
			sampleUs: SAMPLE_US,
			samples: profile.samples.length,
			wallMs: ms(totalUs),
			busyMs: ms(busyUs),
			busyMsPerMove: +(busyUs / 1000 / moves).toFixed(2),
			idleMs: ms(idleUs),
			busyPctOfWall: pct(busyUs),
			bucketsMs: Object.fromEntries(
				Object.entries(buckets).map(([k, v]) => [
					k,
					{ ms: ms(v), pctOfBusy: +((100 * v) / (totalUs - idleUs)).toFixed(1) },
				])
			),
			top: rows.slice(0, 30).map(([fn, us]) => ({
				fn,
				ms: ms(us),
				pctOfBusy: +((100 * us) / (totalUs - idleUs)).toFixed(1),
			})),
		}

		// Write the summary and the raw profile (loadable in the devtools "Performance" panel) next to
		// the other test artifacts, so a CI run keeps them without cluttering the repo or /tmp.
		writeFileSync(testInfo.outputPath(`perf-${LABEL}.json`), JSON.stringify(summary, null, 2))
		writeFileSync(testInfo.outputPath(`perf-${LABEL}.cpuprofile`), JSON.stringify(profile))

		const tbl = summary.top
			.slice(0, 22)
			.map((r) => `  ${String(r.ms).padStart(7)}ms ${String(r.pctOfBusy).padStart(5)}%  ${r.fn}`)
			.join('\n')
		const bkt = Object.entries(summary.bucketsMs)
			.map(
				([k, v]) =>
					`  ${k.padEnd(12)} ${String(v.ms).padStart(7)}ms ${String(v.pctOfBusy).padStart(5)}% of busy`
			)
			.join('\n')
		// eslint-disable-next-line no-console
		console.log(
			`\n=== text resize profile [${LABEL}] ===\n` +
				`shapes=${N} moves=${moves} busy=${summary.busyMs}ms (${summary.busyMsPerMove}ms/move, ${summary.busyPctOfWall}% of wall) idle=${summary.idleMs}ms\n` +
				`buckets (self time):\n${bkt}\n` +
				`top functions by self time:\n${tbl}\n`
		)
	})
})
