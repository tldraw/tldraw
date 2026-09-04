/**
 * Legacy session-DO prune driver. Run from apps/mcp-app with tsx.
 *
 *   yarn prune:list                               # -> prune-ids.txt
 *   yarn prune:run --dry-run                      # histogram, no writes; logs to prune-dry-run.jsonl
 *   yarn prune:run --max-idle 30d                 # condemn DOs idle >= 30d
 *   yarn prune:run --max-idle 3d --force          # below 7d needs --force
 *
 * Real runs write every result to prune-results.jsonl; re-runs re-evaluate kept ids
 * and skip only condemned ones. Dry runs write to the separate prune-dry-run.jsonl and
 * resume from it the same way (nothing is terminal for a dry run, so any prior row —
 * not just destroy-scheduled — means "already evaluated" and is skipped on re-run).
 *
 * Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (list);
 *      MCP_WORKER_ORIGIN (default https://tldraw-mcp-app.tldraw.workers.dev), MCP_PRUNE_ADMIN_TOKEN (prune).
 */
/* eslint-disable no-console */
import { createHash } from 'crypto'
import {
	appendFileSync,
	closeSync,
	createReadStream,
	ftruncateSync,
	openSync,
	readSync,
	existsSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'fs'
import { createInterface } from 'readline'
import { MIN_SAFE_IDLE_MS } from '../src/prune'

const IDS_FILE = 'prune-ids.txt'
const CURSOR_FILE = 'prune-list-cursor.txt'
const PROGRESS_FILE = 'prune-progress.json'
/** Written to the cursor file when the walk reaches the last page. */
const DONE_SENTINEL = 'DONE'
/** The `TldrawMCP` namespace on the tldraw-mcp-app worker. Resolving it by name cost a
 * paged scan of every namespace on the account (every preview worker owns some). */
const NAMESPACE_ID = '164dab144e614bb9ac54367e0ffaf56c'
const RESULTS_FILE = 'prune-results.jsonl'
const DRY_RUN_RESULTS_FILE = 'prune-dry-run.jsonl'
const BATCH = 100
/** How far a finished batch may run ahead of the durable checkpoint. Bounds both the
 * rows a crash replays and the pending-sequence bookkeeping. */
const MAX_UNCOMMITTED_BATCHES = 32
/** Stamped into the pass marker and the checkpoint. Ledgers and checkpoints from an
 * older format never match a current pass, so their rows are neither replayed nor
 * counted, and their offsets are never reused. */
const LEDGER_FORMAT = 2

/** One id together with its 1-based position in the ids file. */
interface Entry {
	id: string
	line: number
}
/** Batches in flight. The ceiling is DO wake latency, not our worker; --concurrency raises it. */
const CONCURRENCY = 4
const DAY = 24 * 60 * 60 * 1000

/** A response that will be identical for every batch (auth, route, validation); abort the run. */
class FatalError extends Error {}

function env(name: string, fallback?: string): string {
	const v = process.env[name] ?? fallback
	if (!v) throw new Error(`Missing env ${name}`)
	return v
}

function parseDuration(s: string): number {
	const m = /^(\d+)(d|h|m)$/.exec(s)
	if (!m) throw new Error(`Bad duration ${s}; use e.g. 30d, 12h, 5m`)
	const n = Number(m[1])
	return m[2] === 'd' ? n * DAY : m[2] === 'h' ? n * 3_600_000 : n * 60_000
}

async function cf(path: string): Promise<any> {
	// A multi-hour walk meets transient failures as a certainty, not a risk: one
	// unretried `fetch failed` used to throw away the whole listing.
	let lastError: unknown
	for (let attempt = 0; attempt < 6; attempt++) {
		if (attempt > 0) await new Promise((r) => setTimeout(r, Math.min(30_000, 2 ** attempt * 1000)))
		try {
			const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
				headers: { Authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}` },
				signal: AbortSignal.timeout(60_000),
			})
			if (res.status === 429 || res.status >= 500) {
				lastError = new Error(`CF API ${path}: HTTP ${res.status}`)
				continue
			}
			const json: any = await res.json()
			if (!json.success) throw new Error(`CF API ${path}: ${JSON.stringify(json.errors)}`)
			return json
		} catch (err) {
			// A rejected body/auth error is terminal; only network-level faults retry.
			if (err instanceof Error && err.message.startsWith('CF API')) throw err
			lastError = err
		}
	}
	throw new Error(`CF API ${path}: giving up after 6 attempts: ${String(lastError)}`)
}

/** Fraction of the id keyspace walked, from an id's leading hex. Ids are hashes, so
 * they arrive in sorted order and are uniformly distributed: position is progress. */
function keyspaceFraction(id: string): number {
	return parseInt(id.slice(0, 6), 16) / 0x1000000
}

function humanDuration(ms: number): string {
	const h = Math.floor(ms / 3_600_000)
	const m = Math.round((ms % 3_600_000) / 60_000)
	return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`
}

async function list(restart: boolean): Promise<void> {
	const account = env('CLOUDFLARE_ACCOUNT_ID')
	console.log(`namespace ${NAMESPACE_ID}`)
	// The cursor is the only way back into a partial walk (the objects endpoint has no
	// start-after), so checkpoint it per page and append when resuming.
	let cursor: string | undefined
	// Ids already on disk, and how far into the keyspace a resumed walk starts. Both
	// projections are relative to those: without them a resume divides this run's
	// zero-based count by an 11%-in position and reports a total that only climbs.
	let baseline = 0
	if (existsSync(CURSOR_FILE) && existsSync(IDS_FILE) && !restart) {
		const saved = readFileSync(CURSOR_FILE, 'utf8').trim()
		if (saved === DONE_SENTINEL) {
			// Left in place deliberately: deleting it would let the next plain `list`
			// fall into the fresh-walk branch and truncate a completed multi-hour file.
			console.log(`${IDS_FILE} is already complete; pass --restart to walk again`)
			return
		}
		if (!saved) throw new Error(`${CURSOR_FILE} is empty; delete it to restart the walk`)
		cursor = saved
		for await (const _ of readLines(IDS_FILE)) baseline++
		console.log(`resuming from saved cursor, ${baseline} ids already in ${IDS_FILE}`)
	} else {
		// Drop the old cursor before truncating: if the first page never lands, a later
		// run must not resume from it against an empty file and skip the prefix.
		rmSync(CURSOR_FILE, { force: true })
		writeFileSync(IDS_FILE, '')
	}
	const startFraction = cursor ? keyspaceFraction(cursor) : 0
	let total = 0
	let withData = 0
	let pages = 0
	const startedAt = Date.now()
	do {
		const q = new URLSearchParams({ limit: '1000' })
		if (cursor) q.set('cursor', cursor)
		const page = await cf(
			`/accounts/${account}/workers/durable_objects/namespaces/${NAMESPACE_ID}/objects?${q}`
		)
		const ids = page.result.filter((o: any) => o.hasStoredData).map((o: any) => o.id)
		total += page.result.length
		withData += ids.length
		if (ids.length) appendFileSync(IDS_FILE, ids.join('\n') + '\n')
		cursor = page.result_info?.cursor || undefined
		// An empty file would read back as "no cursor" and restart the walk from the
		// beginning, re-appending every id; mark the terminal page explicitly instead.
		writeFileSync(CURSOR_FILE, cursor ?? DONE_SENTINEL)

		const lastId = page.result[page.result.length - 1]?.id
		const done = lastId ? keyspaceFraction(lastId) : 0
		const elapsed = Date.now() - startedAt
		const walked = done - startFraction
		const projected = done > 0 ? Math.round((baseline + withData) / done) : 0
		const eta = walked > 0 ? humanDuration((elapsed / walked) * (1 - done)) : '?'
		const line = `${baseline + withData} ids (${(done * 100).toFixed(1)}% of keyspace) ~${projected} projected, eta ${eta}`
		// Overwrite in place for the live view, but leave a durable line every 100 pages
		// so a long walk keeps a history you can eyeball after the fact.
		process.stdout.write(`\r${line}`)
		if (++pages % 100 === 0) process.stdout.write('\n')
	} while (cursor)
	// The sentinel written by the terminal page stays, so the file is not re-walked
	// (and truncated) by accident.
	console.log(`\nwrote ${withData} ids to ${IDS_FILE} (this run)`)
}

/** Stream a file line by line: the ids file and the results log both reach tens of
 * millions of lines, well past what readFileSync can hold. */
/** Content hash of the ids file. A line offset is only meaningful against the exact bytes
 * it was measured on, and Durable Object ids are fixed width: size, count and the extreme
 * ids all survive an edit in the middle. */
async function fileIdentity(file: string): Promise<string> {
	const hash = createHash('sha256')
	for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer)
	return `${statSync(file).size}:${hash.digest('hex').slice(0, 16)}`
}

/** Drops an unterminated final line, so the next append cannot be concatenated onto a
 * fragment and corrupt the row it lands on. */
function repairLedger(file: string): void {
	if (!existsSync(file)) return
	const { size } = statSync(file)
	if (size === 0) return
	const fd = openSync(file, 'r+')
	try {
		const window = Math.min(size, 1 << 16)
		const buf = Buffer.alloc(window)
		readSync(fd, buf, 0, window, size - window)
		if (buf[window - 1] === 0x0a) return
		const lastNewline = buf.lastIndexOf(0x0a)
		const keep = lastNewline === -1 ? 0 : size - window + lastNewline + 1
		ftruncateSync(fd, keep)
		console.log(`repaired ${file}: dropped ${size - keep} bytes of a torn final row`)
	} finally {
		closeSync(fd)
	}
}

/** Yields the current pass's ledger rows: everything after the most recent marker for
 * this pass. Rows from an earlier threshold must not be replayed, and a torn final row
 * from an interrupted append is skipped. */
async function* rowsForPass(file: string, passMarker: string): AsyncGenerator<any> {
	let markerAt = -1
	let index = 0
	for await (const line of readLines(file)) {
		if (line === passMarker) markerAt = index
		index++
	}
	index = 0
	for await (const line of readLines(file)) {
		const at = index++
		if (at <= markerAt) continue
		// The region ends at the next marker: rows past it belong to another pass, whose
		// line numbers index a different ids file and would otherwise be counted here.
		if (line.startsWith('{"pass":')) return
		try {
			const row = JSON.parse(line)
			if (row?.id) yield row
		} catch {
			// torn final line from an interrupted append
		}
	}
}

/** Reports the pass's outcome from its ledger, resolving each source line to the last row
 * written for it. Streams twice and indexes by line number, so memory is one small typed
 * array rather than a set of ids. */
async function summarize(file: string, passMarker: string): Promise<void> {
	if (!existsSync(file)) return
	let maxLine = 0
	for await (const row of rowsForPass(file, passMarker)) {
		if (typeof row.line !== 'number') {
			throw new Error(
				`${file} has rows without a line number: it predates the current ledger format. Delete it and ${PROGRESS_FILE}, then re-run the pass.`
			)
		}
		if (row.line > maxLine) maxLine = row.line
	}
	// Row ordinals are 1-based so that 0 reads as "no row for this line".
	const latest = new Uint32Array(maxLine + 1)
	let ordinal = 0
	for await (const row of rowsForPass(file, passMarker)) {
		ordinal++
		if (typeof row.line === 'number') latest[row.line] = ordinal
	}

	const hist: Record<string, { count: number; bytes: number }> = {}
	let condemned = 0
	let errors = 0
	ordinal = 0
	for await (const row of rowsForPass(file, passMarker)) {
		ordinal++
		if (typeof row.line !== 'number' || latest[row.line] !== ordinal) continue
		if (row.error) {
			errors++
			continue
		}
		const b = bucket(row.idleMs)
		hist[b] ??= { count: 0, bytes: 0 }
		hist[b].count++
		hist[b].bytes += row.bytes ?? 0
		if (row.action === 'destroy-scheduled') condemned++
	}

	console.log('\n\nidle histogram (count / GB):')
	for (const k of ['<7d', '7-30d', '30-90d', '>90d']) {
		const h = hist[k]
		if (h) {
			console.log(
				`  ${k.padEnd(7)} ${String(h.count).padStart(9)}  ${(h.bytes / 1e9).toFixed(2)} GB`
			)
		}
	}
	console.log(`condemned=${condemned} errors=${errors}`)
	if (errors > 0) process.exitCode = 1
}

/** The last pass marker in the ledger, if any. New rows always append to the end, so
 * only that pass can receive them. */
async function lastPassMarker(file: string): Promise<string | undefined> {
	if (!existsSync(file)) return undefined
	let marker: string | undefined
	for await (const line of readLines(file)) {
		if (line.startsWith('{"pass":')) marker = line
	}
	return marker
}

/** Entries whose most recent row in this pass is an error. Keyed by source line, so a
 * retry inherits the position its result belongs to, and scoped to the pass, since line
 * numbers index one specific ids file. */
async function* failedEntriesFromLedger(file: string, passMarker: string): AsyncGenerator<Entry> {
	if (!existsSync(file)) return
	// Only failing lines are held: a small fraction of any pass.
	const failed = new Map<number, string>()
	for await (const row of rowsForPass(file, passMarker)) {
		if (typeof row.line !== 'number') {
			throw new Error(
				`${file} has rows without a line number: it predates the current ledger format. Delete it and ${PROGRESS_FILE}, then re-run the pass.`
			)
		}
		if (row.error) failed.set(row.line, row.id)
		else failed.delete(row.line)
	}
	for (const [line, id] of failed) yield { id, line }
}

async function* readLines(file: string): AsyncGenerator<string> {
	const rl = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })
	for await (const line of rl) {
		if (line) yield line
	}
}

function bucket(idleMs: number | null): string {
	// null (never-active DO) and any other non-finite value bucket as maximally idle.
	if (idleMs === null || !Number.isFinite(idleMs)) return '>90d'
	if (idleMs < 7 * DAY) return '<7d'
	if (idleMs < 30 * DAY) return '7-30d'
	if (idleMs < 90 * DAY) return '30-90d'
	return '>90d'
}

async function prune(args: string[]): Promise<void> {
	const dryRun = args.includes('--dry-run')
	const force = args.includes('--force')
	const idleArg = args[args.indexOf('--max-idle') + 1]
	const maxIdleMs = dryRun && !args.includes('--max-idle') ? 0 : parseDuration(idleArg)
	if (!dryRun && maxIdleMs < MIN_SAFE_IDLE_MS && !force) {
		throw new Error(
			`Refusing to prune below 7d without --force (asked for ${idleArg}); this kills live sessions`
		)
	}
	const retryErrors = args.includes('--retry-errors')
	const concurrencyArg = args.indexOf('--concurrency')
	const concurrency = concurrencyArg === -1 ? CONCURRENCY : Number(args[concurrencyArg + 1])
	if (!Number.isInteger(concurrency) || concurrency < 1)
		throw new Error('--concurrency needs a positive integer')
	const limitArg = args.indexOf('--limit')
	const limit = limitArg === -1 ? Infinity : Number(args[limitArg + 1])
	if (!Number.isFinite(limit) && limitArg !== -1) throw new Error('--limit needs a number')
	const origin = env('MCP_WORKER_ORIGIN', 'https://tldraw-mcp-app.tldraw.workers.dev')
	const token = env('MCP_PRUNE_ADMIN_TOKEN')
	const resultsFile = dryRun ? DRY_RUN_RESULTS_FILE : RESULTS_FILE
	// A line offset is only meaningful against the exact file it was measured on;
	// regenerating or swapping the ids file must invalidate it.
	const idsIdentity = await fileIdentity(IDS_FILE)
	repairLedger(resultsFile)

	// Live counters for the progress line only; summarize() reports the real numbers.
	let condemned = 0
	let errors = 0
	function tally(r: any) {
		if (r.error) errors++
		else if (r.action === 'destroy-scheduled') condemned++
	}

	// Resume by line offset, not by a set of seen ids: at tens of millions of ids a Set
	// costs gigabytes, while the ids file is a stable ordered list and batches are
	// dispatched in order. The offset only carries over for the same run parameters —
	// a longer --max-idle must re-evaluate ids the previous pass kept.
	let skipLines = 0
	if (!retryErrors && existsSync(PROGRESS_FILE)) {
		// A kill during the checkpoint write can leave this truncated; starting the pass
		// over is far better than refusing to run at all.
		let prev: any
		try {
			prev = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'))
		} catch {
			console.log(`${PROGRESS_FILE} is unreadable, starting this pass from the beginning`)
		}
		if (prev) {
			if (
				prev.format === LEDGER_FORMAT &&
				prev.dryRun === dryRun &&
				prev.maxIdleMs === maxIdleMs &&
				prev.idsIdentity === idsIdentity
			) {
				skipLines = prev.linesDone ?? 0
			} else {
				console.log(
					`ignoring progress from a different pass (format=${prev.format}, dryRun=${prev.dryRun}, maxIdle=${prev.maxIdleMs}ms, ids=${prev.idsIdentity})`
				)
			}
		}
	}
	// Mark where this pass begins so a resume replays its own rows, not those of an
	// earlier threshold or of an error a later sweep already repaired.
	const passMarker = JSON.stringify({
		pass: { format: LEDGER_FORMAT, dryRun, maxIdleMs, idsIdentity },
	})
	if (retryErrors) {
		// A sweep appends to the end of the ledger, which lands inside whichever pass
		// marker comes last. Repairing an earlier pass would therefore write its results
		// outside that pass's region: the errors would never clear, and the rows would be
		// counted against the newer pass instead.
		const latest = await lastPassMarker(resultsFile)
		if (latest === undefined) {
			throw new Error(`${resultsFile} has no pass to retry`)
		}
		if (latest !== passMarker) {
			throw new Error(
				`--retry-errors only works on the most recent pass in ${resultsFile}. Re-run it with the arguments of that pass (${latest}), or start a fresh pass.`
			)
		}
	}
	if (skipLines === 0 && !retryErrors) appendFileSync(resultsFile, passMarker + '\n')

	console.log(
		`dryRun=${dryRun}, maxIdle=${maxIdleMs}ms, concurrency=${concurrency}, ${retryErrors ? 'retrying ledger errors' : `resuming at line ${skipLines}`}${limit === Infinity ? '' : `, limit ${limit}`}, appending to ${resultsFile}`
	)

	let dispatched = skipLines
	let fatal: FatalError | undefined
	// Batches finish out of order, so only advance the durable offset across a
	// contiguous run of completed batches; a kill re-does at most CONCURRENCY batches.
	let nextSeq = 0
	const completedSizes = new Map<number, number>()
	let committedLines = skipLines
	let committedBatch = 0

	async function runBatch(batch: Entry[], seq: number) {
		const res = await fetch(`${origin}/admin/prune`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids: batch.map((e) => e.id), maxIdleMs, dryRun, force }),
			signal: AbortSignal.timeout(60_000),
		})
		if (!res.ok) {
			const text = await res.text()
			// Auth/route/validation failures are the same for every batch: stop instead of
			// burning through the whole id file counting errors.
			if ([400, 401, 404, 405].includes(res.status)) {
				throw new FatalError(`/admin/prune ${res.status}: ${text}`)
			}
			throw new Error(`/admin/prune ${res.status}: ${text}`)
		}
		const results: any[] = await res.json()
		const lineOf = new Map(batch.map((e) => [e.id, e.line]))
		let out = ''
		for (const r of results) {
			// The line is what makes a duplicate identifiable later: the same id can be
			// written more than once, but only one row per line is the current result.
			const row = { ...r, line: lineOf.get(r.id) }
			out += JSON.stringify(row) + '\n'
			tally(row)
		}
		appendFileSync(resultsFile, out)
		commit(seq, batch.length)
	}

	/** Advance the durable offset across a contiguous run of finished batches. */
	function commit(seq: number, size: number) {
		completedSizes.set(seq, size)
		// The final batch is short, so count actual ids rather than seq * BATCH.
		for (let s = completedSizes.get(committedBatch); s !== undefined; ) {
			committedLines += s
			completedSizes.delete(committedBatch++)
			s = completedSizes.get(committedBatch)
		}
		if (!retryErrors) {
			// Rename is atomic, so a kill can never leave a half-written checkpoint.
			const payload = JSON.stringify({
				format: LEDGER_FORMAT,
				dryRun,
				maxIdleMs,
				idsIdentity,
				linesDone: committedLines,
			})
			writeFileSync(`${PROGRESS_FILE}.tmp`, payload)
			renameSync(`${PROGRESS_FILE}.tmp`, PROGRESS_FILE)
		}
	}

	const inFlight = new Map<number, Promise<void>>()
	async function dispatch(batch: Entry[]) {
		const seq = nextSeq++
		const task = runBatch(batch, seq)
			.catch((err) => {
				if (err instanceof FatalError) {
					fatal ??= err
					return
				}
				// A whole-batch failure still has to be recorded and committed: without a
				// ledger row --retry-errors can never find these ids, and without a commit
				// the offset freezes here for the rest of the run.
				const message = err instanceof Error ? err.message : String(err)
				let out = ''
				for (const entry of batch) {
					const row = { id: entry.id, line: entry.line, error: `batch: ${message}` }
					out += JSON.stringify(row) + '\n'
					tally(row)
				}
				appendFileSync(resultsFile, out)
				commit(seq, batch.length)
				console.error(`\nbatch failed: ${message}`)
			})
			.finally(() => {
				inFlight.delete(seq)
			})
		inFlight.set(seq, task)
		dispatched += batch.length
		process.stdout.write(`\r${dispatched} processed, condemned=${condemned} errors=${errors}`)
		// Two separate bounds. `concurrency` caps work in flight; MAX_UNCOMMITTED_BATCHES
		// caps how far ahead of the durable checkpoint a completed batch can get. Without
		// the second, one slow early sequence lets unboundedly many later batches finish
		// and be replayed after a crash — past any dedupe window — while `completedSizes`
		// grows with them.
		while (
			inFlight.size > 0 &&
			(inFlight.size >= concurrency || nextSeq - committedBatch >= MAX_UNCOMMITTED_BATCHES)
		) {
			await Promise.race(inFlight.values())
		}
		// ~10 req/s per worker -> ~1000 DO wakes/s
		await new Promise((r) => setTimeout(r, 100 / concurrency))
	}

	let lineNo = 0
	let batch: Entry[] = []
	// Offset resume walks past error rows and never returns to them, so failures need
	// their own sweep: --retry-errors re-reads the ledger instead of the ids file.
	const source = retryErrors
		? failedEntriesFromLedger(resultsFile, passMarker)
		: (async function* () {
				let n = 0
				for await (const id of readLines(IDS_FILE)) yield { id, line: ++n }
			})()
	for await (const entry of source) {
		lineNo++
		if (!retryErrors && lineNo <= skipLines) continue
		if (lineNo - (retryErrors ? 0 : skipLines) > limit) break
		batch.push(entry)
		if (batch.length < BATCH) continue
		await dispatch(batch)
		batch = []
		if (fatal) break
	}
	if (batch.length && !fatal) await dispatch(batch)
	await Promise.all(inFlight.values())

	// The live counters above are progress only: batches finish out of order, a resume
	// re-runs whatever the checkpoint had not committed, and a sweep supersedes errors,
	// so any arrival-order accounting drifts. The reported numbers come from the ledger
	// instead, keeping exactly one row per source line — the last one written.
	await summarize(resultsFile, passMarker)

	if (fatal !== undefined) throw new FatalError(fatal.message)
}

const [cmd, ...rest] = process.argv.slice(2)
const run =
	cmd === 'list'
		? list(rest.includes('--restart'))
		: cmd === 'prune'
			? prune(rest)
			: Promise.reject(new Error('usage: list | prune'))
run.catch((err) => {
	console.error(err.message ?? err)
	process.exit(1)
})
