// Lightweight per-phase timing for the game loop. Each call to `time(name, fn)`
// runs `fn`, records its wall-clock duration, and accumulates a rolling
// average over the last `WINDOW` samples. The aggregated stats live in an
// atom so the HUD or dev tooling can subscribe to them.
//
// We ship two perf surfaces:
//   1) This module — fine-grained per-phase microsecond timings of the sim.
//   2) tldraw's `PerformanceTracker` from `@tldraw/utils`, started during heavy
//      bursts (large battles) so we can correlate FPS dips to phase costs.
//      See game-loop.ts for the wiring.
//
// Optimisation notes for later (tracked here so future tuning has a starting
// point):
//   - tickUnits is O(units²) when many units are stacked because of the
//     auto-engage scan. A spatial grid keyed by cell would knock this down.
//   - tickTowers iterates every alive enemy unit per tower. Same spatial-grid
//     opportunity.
//   - tickProjectiles re-filters enemies per projectile — could share the
//     filtered array per tick.
//   - syncBuildings walks getCurrentPageShapes() twice (once for snapshot,
//     once for foodCap). Merge into one walk.
//   - fog.computeFog is fine at current map size (3300 cells) but at 4x
//     map size we'd want to dirty-track changed regions instead of scanning
//     the whole grid.

import { PerformanceTracker, atom } from 'tldraw'

const WINDOW = 60 // tracks roughly 1 second at 60Hz, 3 seconds at 20Hz

const samples = new Map<string, number[]>()

export interface PerfStats {
	// Average duration over the last `WINDOW` samples, by phase name.
	avgMsByPhase: Record<string, number>
	maxMsByPhase: Record<string, number>
	// Total of all phases for the latest tick — a quick "is the tick fitting
	// in our 50ms budget" indicator.
	lastTickTotalMs: number
}

export const perfStats$ = atom<PerfStats>('perfStats', {
	avgMsByPhase: {},
	maxMsByPhase: {},
	lastTickTotalMs: 0,
})

let _lastTickTotal = 0

/** Time a synchronous block. Records the duration in the rolling window. */
export function time<T>(name: string, fn: () => T): T {
	const start = performance.now()
	const result = fn()
	const dur = performance.now() - start
	record(name, dur)
	return result
}

/** Record a duration without running anything (for code that's already timed). */
export function record(name: string, durMs: number) {
	let arr = samples.get(name)
	if (!arr) {
		arr = []
		samples.set(name, arr)
	}
	arr.push(durMs)
	if (arr.length > WINDOW) arr.shift()
	_lastTickTotal += durMs
}

/** Call once per sim tick after all phases have been timed. Publishes the
 * rolling stats so subscribers (HUD, dev panel) can read them. */
export function flushTickStats() {
	const avg: Record<string, number> = {}
	const max: Record<string, number> = {}
	for (const [name, arr] of samples) {
		if (arr.length === 0) continue
		let total = 0
		let m = 0
		for (const d of arr) {
			total += d
			if (d > m) m = d
		}
		avg[name] = total / arr.length
		max[name] = m
	}
	perfStats$.set({
		avgMsByPhase: avg,
		maxMsByPhase: max,
		lastTickTotalMs: _lastTickTotal,
	})
	_lastTickTotal = 0
}

export function resetPerfStats() {
	samples.clear()
	_lastTickTotal = 0
	perfStats$.set({ avgMsByPhase: {}, maxMsByPhase: {}, lastTickTotalMs: 0 })
}

// Internal — used by tests / debug tools.
export function _peek(): { samples: Map<string, number[]> } {
	return { samples }
}

// ---------------------------- reporter ----------------------------
//
// On demand we can print the rolling phase stats to the console — handy for
// quick "is the tick fitting in budget" checks without a HUD. Opt-in so we
// don't spam the console by default.
//
// Usage from devtools:
//   __tlcraftPerf.snapshot()         // returns the current perfStats$ value
//   __tlcraftPerf.startReport(2000)  // log every 2s
//   __tlcraftPerf.stopReport()
//   __tlcraftPerf.fps()              // start a 1s FPS trace via tldraw's PerformanceTracker

let _reportInterval: ReturnType<typeof setInterval> | null = null
const _fpsTracker = typeof window === 'undefined' ? null : new PerformanceTracker()

function formatStats(): string {
	const s = perfStats$.get()
	const phases = Object.keys(s.avgMsByPhase).sort((a, b) => s.avgMsByPhase[b] - s.avgMsByPhase[a])
	if (phases.length === 0) return ''
	const breakdown = phases
		.map((p) => `${p}: ${s.avgMsByPhase[p].toFixed(2)}ms (max ${s.maxMsByPhase[p].toFixed(2)})`)
		.join(' · ')
	return `tick total ${s.lastTickTotalMs.toFixed(2)}ms · ${breakdown}`
}

export function startPerfReporter(intervalMs = 3000) {
	if (typeof window === 'undefined') return () => {}
	if (_reportInterval) clearInterval(_reportInterval)
	_reportInterval = setInterval(() => {
		const line = formatStats()
		if (!line) return
		// eslint-disable-next-line no-console
		console.debug(
			`%c[tlcraft perf]%c ${line}`,
			'color: white; background: #3b82f6; padding: 1px 5px; border-radius: 3px; font-weight: 600',
			'color: inherit; font: inherit'
		)
	}, intervalMs)
	return () => stopPerfReporter()
}

export function stopPerfReporter() {
	if (_reportInterval) clearInterval(_reportInterval)
	_reportInterval = null
}

/** Run a 1-second FPS measurement using tldraw's PerformanceTracker. Logs a
 * coloured summary to the console (green > 55fps, yellow 30-55, red < 30). */
export function traceFpsBurst(name = 'tlcraft', durationMs = 1000) {
	if (!_fpsTracker) return
	if (_fpsTracker.isStarted()) _fpsTracker.stop()
	_fpsTracker.start(name)
	setTimeout(() => {
		if (_fpsTracker.isStarted()) _fpsTracker.stop()
	}, durationMs)
}

// Expose a small surface on window so devtools sessions don't need to import
// anything to poke at the numbers. No production-mode gating; the example is
// dev-only.
if (typeof window !== 'undefined') {
	;(window as unknown as { __tlcraftPerf?: object }).__tlcraftPerf = {
		snapshot: () => perfStats$.get(),
		startReport: startPerfReporter,
		stopReport: stopPerfReporter,
		fps: traceFpsBurst,
	}
}

// ------------------------- server-side reporter -------------------------
//
// When the dev server is started with TLCRAFT_PERF=1, the Vite plugin in
// apps/examples/vite.config.ts logs received perf snapshots to the terminal.
// On the page side, we POST a snapshot every couple seconds while a match is
// running. The user gets perf data in their `yarn dev` terminal without
// opening devtools or browser console at all.

// `process.env.TLCRAFT_PERF` is replaced at build time by Vite's `define`.
const SERVER_REPORTER_ENABLED =
	typeof process !== 'undefined' &&
	(process.env.TLCRAFT_PERF === '1' || process.env.TLCRAFT_PERF === 'true')

let _serverInterval: ReturnType<typeof setInterval> | null = null

function startServerReporter(intervalMs = 2000) {
	if (typeof window === 'undefined') return
	if (_serverInterval) clearInterval(_serverInterval)
	_serverInterval = setInterval(() => {
		const stats = perfStats$.get()
		if (Object.keys(stats.avgMsByPhase).length === 0) return
		// Best-effort POST. We don't await or retry — if the server is gone
		// (preview build, prod, network glitch) we silently skip this tick.
		fetch('/__tlcraft-perf', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(stats),
			keepalive: true,
		}).catch(() => {})
	}, intervalMs)
}

if (SERVER_REPORTER_ENABLED && typeof window !== 'undefined') {
	startServerReporter()
}
