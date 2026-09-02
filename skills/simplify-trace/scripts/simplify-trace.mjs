#!/usr/bin/env node
// Summarize a Chrome DevTools performance trace into a compact markdown report.
// Surfaces the work that takes too long or happens too often, so an agent can
// reason about a multi-hundred-MB trace without loading the whole thing.
//
// Usage:
//   node simplify-trace.mjs <trace.json> [--top N] [--long-task-ms MS] [--out FILE]
//
// For very large traces (>~500MB) increase Node's heap:
//   node --max-old-space-size=8192 simplify-trace.mjs <trace.json>

import fs from 'node:fs'

// Sections the report can emit. `default` is the compact overview; the rest are
// opt-in via --only / --all so the tool can answer a narrow question.
const SECTIONS = {
	summary: 'header: counts, span, CPU time, idle %',
	timeline: 'per-second main-thread busy time (find when activity happens)',
	longtasks: 'top-level tasks over the threshold (main-thread jank)',
	events: 'hottest event types by self time',
	frequent: 'most frequent event types by count',
	functions: 'hottest JS functions from the CPU profile (self time)',
	categories: 'self time grouped by trace category',
	network: 'resource/fetch waterfall: offset, TTFB, duration, size, URL',
	websocket: 'WebSocket lifecycle: create/destroy/send/receive/handshake',
}
const DEFAULT_SECTIONS = ['summary', 'longtasks', 'events', 'frequent', 'functions', 'categories']
const ALL_SECTIONS = Object.keys(SECTIONS)

function parseList(s) {
	return s.split(',').map((x) => x.trim()).filter(Boolean)
}

function parseArgs(argv) {
	const opts = { top: 25, longTaskMs: 50, out: null, file: null, window: null, only: null, except: null, match: null, list: false }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--top') opts.top = Number(argv[++i])
		else if (a === '--long-task-ms') opts.longTaskMs = Number(argv[++i])
		else if (a === '--out') opts.out = argv[++i]
		else if (a === '--only') opts.only = parseList(argv[++i])
		else if (a === '--except') opts.except = parseList(argv[++i])
		else if (a === '--all') opts.only = ALL_SECTIONS.slice()
		else if (a === '--match') opts.match = argv[++i]
		else if (a === '--wall-clock') opts.wallClock = true
		else if (a === '--list') opts.list = true
		else if (a === '--window') {
			// "<startMs>-<endMs>" as offsets from the trace start
			const [s, e] = argv[++i].split('-').map(Number)
			opts.window = { start: s, end: e }
		} else if (!a.startsWith('--')) opts.file = a
	}
	return opts
}

// Recording artifacts: the profiler starting/stopping shows up as a 50-60ms
// "task" that is not app work. Exclude it from the long-task ranking so it
// doesn't masquerade as the worst jank.
const ARTIFACT_NAMES = new Set(['CpuProfiler::StartProfiling', 'CpuProfiler::StopProfiling'])

const opts = parseArgs(process.argv.slice(2))

if (opts.list) {
	console.log('Sections (--only a,b / --except a,b / --all):\n')
	for (const k of ALL_SECTIONS) {
		const def = DEFAULT_SECTIONS.includes(k) ? ' (default)' : ''
		console.log(`  ${k.padEnd(11)} ${SECTIONS[k]}${def}`)
	}
	process.exit(0)
}
if (!opts.file) {
	console.error(
		'Usage: node simplify-trace.mjs <trace.json> [--top N] [--long-task-ms MS] [--window START-END]\n' +
			'                            [--only a,b | --except a,b | --all] [--match TEXT] [--out FILE] [--list]'
	)
	process.exit(1)
}

// Resolve which sections to emit, preserving a stable display order.
let wantSections = opts.only ? opts.only : DEFAULT_SECTIONS.slice()
const unknown = wantSections.filter((k) => !SECTIONS[k])
if (unknown.length) {
	console.error(`Unknown section(s): ${unknown.join(', ')}. Run --list to see options.`)
	process.exit(1)
}
if (opts.except) wantSections = wantSections.filter((k) => !opts.except.includes(k))
const selected = new Set(wantSections)
const matchLc = opts.match ? opts.match.toLowerCase() : null
const matches = (s) => !matchLc || (s || '').toLowerCase().includes(matchLc)

const ms = (us) => Math.round(us / 100) / 10 // microseconds -> ms, 1 decimal
const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0)

const raw = JSON.parse(fs.readFileSync(opts.file, 'utf8'))
const events = Array.isArray(raw) ? raw : raw.traceEvents || []

// ---- process / thread names (from metadata 'M' events) -------------------
const threadNames = new Map() // `${pid}:${tid}` -> name
const procNames = new Map() // pid -> name
for (const e of events) {
	if (e.ph !== 'M') continue
	if (e.name === 'thread_name') threadNames.set(`${e.pid}:${e.tid}`, e.args?.name)
	if (e.name === 'process_name') procNames.set(e.pid, e.args?.name)
}

// ---- trace bounds --------------------------------------------------------
// Ignore ts <= 0: metadata ('M') and some bookkeeping events report ts:0 and
// would otherwise pin the trace start to zero and break every offset.
let minTs = Infinity
let maxTs = -Infinity
for (const e of events) {
	if (typeof e.ts !== 'number' || e.ts <= 0) continue
	if (e.ts < minTs) minTs = e.ts
	const end = e.ts + (e.dur || 0)
	if (end > maxTs) maxTs = end
}
const traceDur = maxTs - minTs

// ---- optional time window ------------------------------------------------
// --window START-END scopes the whole report to a slice of the recording
// (offsets in ms from trace start) — use it to focus on the moment an action
// happened instead of averaging it against idle time.
const winLo = opts.window ? minTs + opts.window.start * 1000 : -Infinity
const winHi = opts.window ? minTs + opts.window.end * 1000 : Infinity
const inWin = (ts) => ts >= winLo && ts <= winHi
let scopedCount = 0

// ---- aggregate complete (X) events by name, with self time ---------------
// Self time = own duration minus the duration of directly-nested children on
// the same thread. We reconstruct nesting with a per-thread stack.
const byThread = new Map()
for (const e of events) {
	if (!inWin(e.ts)) continue
	scopedCount++
	if (e.ph !== 'X' || typeof e.dur !== 'number') continue
	const key = `${e.pid}:${e.tid}`
	if (!byThread.has(key)) byThread.set(key, [])
	byThread.get(key).push(e)
}

const agg = new Map() // name -> { count, total, self, max }
const topLevelTasks = [] // candidate "long tasks"
const selfByCat = new Map() // category -> self time

function bump(map, k, dur) {
	map.set(k, (map.get(k) || 0) + dur)
}

for (const [, list] of byThread) {
	// Sort by start asc, then by duration desc so parents precede children.
	list.sort((a, b) => a.ts - b.ts || b.dur - a.dur)
	const stack = []
	for (const e of list) {
		while (stack.length && e.ts >= stack[stack.length - 1].ts + stack[stack.length - 1].dur) {
			stack.pop()
		}
		const depth = stack.length
		// subtract this event's duration from its parent's self time
		if (stack.length) stack[stack.length - 1]._childDur += e.dur
		// attribute artifact time (e.g. profiler start) to the enclosing
		// top-level task at any depth, so it can be discounted later
		if (stack.length && ARTIFACT_NAMES.has(e.name)) stack[0]._artifactDur = (stack[0]._artifactDur || 0) + e.dur
		e._childDur = 0
		stack.push(e)
		if (depth === 0) topLevelTasks.push(e)
	}
}

for (const [, list] of byThread) {
	for (const e of list) {
		const self = e.dur - (e._childDur || 0)
		let a = agg.get(e.name)
		if (!a) {
			a = { count: 0, total: 0, self: 0, max: 0 }
			agg.set(e.name, a)
		}
		a.count++
		a.total += e.dur
		a.self += self
		if (e.dur > a.max) a.max = e.dur
		const cat = (e.cat || '').split(',')[0] || '(none)'
		bump(selfByCat, cat, self)
	}
}

// ---- CPU profile reconstruction (Profile + ProfileChunk) -----------------
// Group chunks by profile id, accumulate node tree + samples, attribute each
// sample's timeDelta to its node. Aggregate self/total time per call frame.
const profiles = new Map() // id -> { nodes: Map, selfByNode: Map }
function getProfile(id) {
	if (!profiles.has(id)) profiles.set(id, { nodes: new Map(), selfByNode: new Map() })
	return profiles.get(id)
}
for (const e of events) {
	if (e.name !== 'ProfileChunk' && e.name !== 'Profile') continue
	const id = e.id ?? `${e.pid}:${e.tid}`
	const p = getProfile(id)
	const data = e.args?.data || {}
	const cp = data.cpuProfile || data
	if (Array.isArray(cp.nodes)) {
		for (const n of cp.nodes) p.nodes.set(n.id, n)
		// build parent links: nodes either list children ids or carry a parent id
		for (const n of cp.nodes) {
			if (n.parent != null) n._parent = n.parent
			if (Array.isArray(n.children)) {
				for (const c of n.children) {
					const child = p.nodes.get(c)
					if (child) child._parent = n.id
				}
			}
		}
	}
	// Always accumulate nodes (they're defined incrementally and an in-window
	// sample may reference one declared earlier), but only attribute samples
	// from chunks inside the window. Chunk-level granularity is coarse but fine
	// for focusing on a moment.
	if (!inWin(e.ts)) continue
	const samples = cp.samples || data.samples
	const deltas = data.timeDeltas || cp.timeDeltas
	if (Array.isArray(samples) && Array.isArray(deltas)) {
		for (let i = 0; i < samples.length; i++) {
			const nid = samples[i]
			const dt = deltas[i] || 0
			p.selfByNode.set(nid, (p.selfByNode.get(nid) || 0) + dt)
		}
	}
}

// Aggregate by call frame across all profiles.
const frameSelf = new Map() // key -> { self, fn, loc }
const nodeTotal = new Map() // `${id}:${nodeId}` -> total (self + descendants)
let cpuTotal = 0
function frameKey(cf) {
	const fn = cf.functionName || '(anonymous)'
	const loc = cf.url ? `${cf.url}:${cf.lineNumber ?? '?'}` : cf.codeType || ''
	return { key: `${fn}@@${loc}`, fn, loc }
}
for (const [, p] of profiles) {
	// self per frame + roll self up to ancestors for total time
	for (const [nid, self] of p.selfByNode) {
		cpuTotal += self
		const node = p.nodes.get(nid)
		if (!node) continue
		const { key, fn, loc } = frameKey(node.callFrame || {})
		let f = frameSelf.get(key)
		if (!f) {
			f = { self: 0, total: 0, fn, loc, count: 0 }
			frameSelf.set(key, f)
		}
		f.self += self
		// walk ancestors, add to each frame's total (dedup per frame per sample-origin)
		const seenFrames = new Set()
		let cur = node
		let guard = 0
		while (cur && guard++ < 1000) {
			const fk = frameKey(cur.callFrame || {})
			if (!seenFrames.has(fk.key)) {
				seenFrames.add(fk.key)
				let tf = frameSelf.get(fk.key)
				if (!tf) {
					tf = { self: 0, total: 0, fn: fk.fn, loc: fk.loc, count: 0 }
					frameSelf.set(fk.key, tf)
				}
				tf.total += self
			}
			cur = cur._parent != null ? p.nodes.get(cur._parent) : null
		}
	}
}

// ---- section builders ----------------------------------------------------
const out = []
const N = opts.top
const offset = (ts) => ms(ts - minTs) // ts -> ms offset from trace start

// Wall-clock correlation: metadata.startTime (UTC) anchors offset 0, so trace
// timestamps can be lined up against server logs (zero-cache, sync-worker).
const startEpoch = raw.metadata?.startTime ? Date.parse(raw.metadata.startTime) : NaN
const wallEnabled = opts.wallClock && !Number.isNaN(startEpoch)
const wall = (ts) => new Date(startEpoch + (ts - minTs) / 1000).toISOString().slice(11, 23) + 'Z'
// header cell + row cell for an optional "UTC" column on time-localized tables
const utcHead = wallEnabled ? ' UTC |' : ''
const utcCell = (ts) => (wallEnabled ? ` ${wall(ts)} |` : '')

const builders = {
	summary() {
		out.push(`# Trace summary: ${opts.file.split('/').pop()}`)
		out.push('')
		if (opts.window) {
			out.push(`- **Window: ${opts.window.start}–${opts.window.end} ms** (of ${ms(traceDur)} ms total)`)
			out.push(`- Events in window: **${scopedCount.toLocaleString()}** / ${events.length.toLocaleString()}`)
		} else {
			out.push(`- Events: **${events.length.toLocaleString()}**`)
			out.push(`- Wall-clock span: **${ms(traceDur)} ms**`)
		}
		if (cpuTotal) out.push(`- Sampled CPU time (JS): **${ms(cpuTotal)} ms**`)
		out.push(`- Threads with timed work: **${byThread.size}**`)
		if (cpuTotal) {
			const idle = frameSelf.get('(idle)@@other')?.self || 0
			out.push(`- Idle (sampled): **${ms(idle)} ms (${pct(idle, cpuTotal)}%)**`)
		}
		out.push('')
	},

	timeline() {
		// Per-second main-thread busy time over the WHOLE trace (ignores --window;
		// its purpose is to locate when activity happens so you can then window).
		const buckets = new Map()
		for (const e of topLevelTasks) {
			const sec = Math.floor(offset(e.ts) / 1000)
			buckets.set(sec, (buckets.get(sec) || 0) + e.dur)
		}
		out.push(`## Main-thread busy time (per second)`)
		out.push('')
		out.push('| sec | busy (ms) |')
		out.push('|---|---|')
		;[...buckets.entries()]
			.sort((a, b) => a[0] - b[0])
			.filter(([, d]) => d / 1000 >= 5)
			.forEach(([s, d]) => out.push(`| ${s} | ${ms(d)} |`))
		out.push('')
	},

	longtasks() {
		const longMs = opts.longTaskMs
		const tasks = topLevelTasks
			// drop tasks that are themselves an artifact or are >50% artifact time
			.filter((e) => e.dur >= longMs * 1000 && !ARTIFACT_NAMES.has(e.name) && (e._artifactDur || 0) < e.dur * 0.5)
			.sort((a, b) => b.dur - a.dur)
			.slice(0, N)
		out.push(`## Long tasks (top-level ≥ ${longMs} ms)`)
		out.push('')
		if (!tasks.length) {
			out.push(`_None ≥ ${longMs} ms (excluding profiler artifacts)._`)
		} else {
			out.push(`| # | dur (ms) | @ offset (ms) |${utcHead} name | thread |`)
			out.push(`|---|---|---|${wallEnabled ? '---|' : ''}---|---|`)
			tasks.forEach((e, i) => {
				const tn = threadNames.get(`${e.pid}:${e.tid}`) || `tid ${e.tid}`
				out.push(`| ${i + 1} | ${ms(e.dur)} | ${offset(e.ts)} |${utcCell(e.ts)} ${e.name} | ${tn} |`)
			})
		}
		out.push('')
	},

	events() {
		const rows = [...agg.entries()]
			.map(([name, a]) => ({ name, ...a }))
			.filter((a) => matches(a.name))
			.sort((a, b) => b.self - a.self)
			.slice(0, N)
		out.push(`## Hottest event types (by self time)`)
		out.push('')
		out.push('| name | count | self (ms) | total (ms) | avg (ms) | max (ms) |')
		out.push('|---|---|---|---|---|---|')
		for (const a of rows) {
			out.push(
				`| ${a.name} | ${a.count.toLocaleString()} | ${ms(a.self)} | ${ms(a.total)} | ${ms(a.total / a.count)} | ${ms(a.max)} |`
			)
		}
		out.push('')
	},

	frequent() {
		const rows = [...agg.entries()]
			.map(([name, a]) => ({ name, ...a }))
			.filter((a) => matches(a.name))
			.sort((a, b) => b.count - a.count)
			.slice(0, N)
		out.push(`## Most frequent event types (by count)`)
		out.push('')
		out.push('| name | count | total (ms) | self (ms) | avg (ms) |')
		out.push('|---|---|---|---|---|')
		for (const a of rows) {
			out.push(`| ${a.name} | ${a.count.toLocaleString()} | ${ms(a.total)} | ${ms(a.self)} | ${ms(a.total / a.count)} |`)
		}
		out.push('')
	},

	functions() {
		if (!frameSelf.size) return
		// Drop synthetic idle/program frames; idle is reported in the header.
		const noise = new Set(['(idle)', '(program)', '(root)'])
		const rows = [...frameSelf.values()]
			.filter((f) => f.self > 0 && !noise.has(f.fn) && (matches(f.fn) || matches(f.loc)))
			.sort((a, b) => b.self - a.self)
			.slice(0, N)
		out.push(`## Hottest JS functions (CPU profile, self time)`)
		out.push('')
		out.push('| function | self (ms) | self % | total (ms) | location |')
		out.push('|---|---|---|---|---|')
		for (const f of rows) out.push(`| ${f.fn} | ${ms(f.self)} | ${pct(f.self, cpuTotal)}% | ${ms(f.total)} | ${f.loc} |`)
		out.push('')
	},

	categories() {
		const rows = [...selfByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
		out.push(`## Self time by category`)
		out.push('')
		out.push('| category | self (ms) |')
		out.push('|---|---|')
		for (const [cat, dur] of rows) out.push(`| ${cat} | ${ms(dur)} |`)
		out.push('')
	},

	network() {
		// Reconstruct requests from Resource* events keyed by requestId.
		const NET = new Set(['ResourceSendRequest', 'ResourceReceiveResponse', 'ResourceFinish'])
		const reqs = new Map()
		for (const e of events) {
			if (!NET.has(e.name)) continue
			const d = e.args?.data || {}
			const id = d.requestId
			if (!id) continue
			let r = reqs.get(id)
			if (!r) reqs.set(id, (r = {}))
			if (e.name === 'ResourceSendRequest') {
				r.url = d.url
				r.send = e.ts
				r.method = d.requestMethod
			} else if (e.name === 'ResourceReceiveResponse') {
				r.resp = e.ts
				r.status = d.statusCode
			} else if (e.name === 'ResourceFinish') {
				r.finish = e.ts
				r.size = d.encodedDataLength
			}
		}
		const list = [...reqs.values()]
			.filter((r) => r.send && inWin(r.send) && matches(r.url))
			.sort((a, b) => a.send - b.send)
		out.push(`## Network requests (${list.length})`)
		out.push('')
		if (!list.length) {
			out.push('_None in scope._')
			out.push('')
			return
		}
		out.push(`| @ offset (ms) |${utcHead} ttfb (ms) | dur (ms) | size (KB) | status | url |`)
		out.push(`|---|${wallEnabled ? '---|' : ''}---|---|---|---|---|`)
		for (const r of list.slice(0, N)) {
			const ttfb = r.resp ? ms(r.resp - r.send) : '-'
			const dur = r.finish ? ms(r.finish - r.send) : '-'
			const kb = r.size ? Math.round(r.size / 102.4) / 10 : '-'
			const url = (r.url || '').replace(/^https?:\/\//, '').slice(0, 90)
			out.push(`| ${offset(r.send)} |${utcCell(r.send)} ${ttfb} | ${dur} | ${kb} | ${r.status || ''} | ${url} |`)
		}
		if (list.length > N) out.push(`\n_…${list.length - N} more (raise --top)._`)
		out.push('')
	},

	websocket() {
		const ws = events
			.filter((e) => /WebSocket/.test(e.name || '') && inWin(e.ts))
			.sort((a, b) => a.ts - b.ts)
		out.push(`## WebSocket timeline (${ws.length})`)
		out.push('')
		if (!ws.length) {
			out.push('_No WebSocket events in scope._')
			out.push('')
			return
		}
		out.push(`| @ offset (ms) |${utcHead} event | url |`)
		out.push(`|---|${wallEnabled ? '---|' : ''}---|---|`)
		for (const e of ws.slice(0, N)) {
			const url = (e.args?.data?.url || '').slice(0, 80)
			out.push(`| ${offset(e.ts)} |${utcCell(e.ts)} ${e.name} | ${url} |`)
		}
		out.push('')
	},
}

// Emit selected sections in canonical order.
for (const key of ALL_SECTIONS) if (selected.has(key)) builders[key]()

const report = out.join('\n').replace(/\n{3,}/g, '\n\n')
if (opts.out) {
	fs.writeFileSync(opts.out, report)
	console.error(`Wrote ${opts.out} (${report.length} bytes) from ${(fs.statSync(opts.file).size / 1e6).toFixed(1)} MB trace`)
} else {
	process.stdout.write(report)
}
