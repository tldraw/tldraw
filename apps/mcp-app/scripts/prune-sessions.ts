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
import {
	appendFileSync,
	createReadStream,
	existsSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'fs'
import { createInterface } from 'readline'
import { MIN_SAFE_IDLE_MS } from '../src/prune'

const IDS_FILE = 'prune-ids.txt'
const CURSOR_FILE = 'prune-list-cursor.txt'
const PROGRESS_FILE = 'prune-progress.json'
/** The `TldrawMCP` namespace on the tldraw-mcp-app worker. Resolving it by name cost a
 * paged scan of every namespace on the account (every preview worker owns some). */
const NAMESPACE_ID = '164dab144e614bb9ac54367e0ffaf56c'
const RESULTS_FILE = 'prune-results.jsonl'
const DRY_RUN_RESULTS_FILE = 'prune-dry-run.jsonl'
const BATCH = 100
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
		cursor = readFileSync(CURSOR_FILE, 'utf8').trim() || undefined
		for await (const _ of readLines(IDS_FILE)) baseline++
		console.log(`resuming from saved cursor, ${baseline} ids already in ${IDS_FILE}`)
	} else {
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
		writeFileSync(CURSOR_FILE, cursor ?? '')

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
	rmSync(CURSOR_FILE, { force: true })
	console.log(`\nwrote ${withData} ids to ${IDS_FILE} (this run)`)
}

/** Stream a file line by line: the ids file and the results log both reach tens of
 * millions of lines, well past what readFileSync can hold. */
/** Ids whose most recent ledger row is an error, so a sweep does not re-do successes. */
async function* errorIdsFromLedger(file: string): AsyncGenerator<string> {
	if (!existsSync(file)) return
	const failed = new Map<string, boolean>()
	for await (const line of readLines(file)) {
		const r = JSON.parse(line)
		failed.set(r.id, Boolean(r.error))
	}
	for (const [id, isError] of failed) {
		if (isError) yield id
	}
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
	const idsSize = statSync(IDS_FILE).size

	const hist: Record<string, { count: number; bytes: number }> = {}
	let condemned = 0
	let errors = 0
	function tally(r: any) {
		if (r.error) {
			errors++
			return
		}
		const b = bucket(r.idleMs)
		hist[b] ??= { count: 0, bytes: 0 }
		hist[b].count++
		hist[b].bytes += r.bytes ?? 0
		if (r.action === 'destroy-scheduled') condemned++
	}

	// Resume by line offset, not by a set of seen ids: at tens of millions of ids a Set
	// costs gigabytes, while the ids file is a stable ordered list and batches are
	// dispatched in order. The offset only carries over for the same run parameters —
	// a longer --max-idle must re-evaluate ids the previous pass kept.
	let skipLines = 0
	if (!retryErrors && existsSync(PROGRESS_FILE)) {
		const prev = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'))
		if (prev.dryRun === dryRun && prev.maxIdleMs === maxIdleMs && prev.idsSize === idsSize) {
			skipLines = prev.linesDone ?? 0
		} else {
			console.log(
				`ignoring progress from a different pass (dryRun=${prev.dryRun}, maxIdle=${prev.maxIdleMs}ms, idsSize=${prev.idsSize})`
			)
		}
	}
	// Replay the log so a resumed run reports the whole pass, not just its remainder.
	if (skipLines > 0 && existsSync(resultsFile)) {
		for await (const line of readLines(resultsFile)) tally(JSON.parse(line))
	}

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

	async function runBatch(batch: string[], seq: number) {
		const res = await fetch(`${origin}/admin/prune`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids: batch, maxIdleMs, dryRun, force }),
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
		let out = ''
		for (const r of results) {
			out += JSON.stringify(r) + '\n'
			tally(r)
		}
		appendFileSync(resultsFile, out)
		completedSizes.set(seq, batch.length)
		// The final batch is short, so count actual ids rather than seq * BATCH.
		for (let size = completedSizes.get(committedBatch); size !== undefined; ) {
			committedLines += size
			completedSizes.delete(committedBatch++)
			size = completedSizes.get(committedBatch)
		}
		if (!retryErrors) {
			writeFileSync(
				PROGRESS_FILE,
				JSON.stringify({ dryRun, maxIdleMs, idsSize, linesDone: committedLines })
			)
		}
	}

	const inFlight = new Map<number, Promise<void>>()
	async function dispatch(batch: string[]) {
		const seq = nextSeq++
		const task = runBatch(batch, seq)
			.catch((err) => {
				if (err instanceof FatalError) {
					fatal ??= err
					return
				}
				errors += batch.length
				console.error(`\nbatch failed: ${String(err)}`)
			})
			.finally(() => {
				inFlight.delete(seq)
			})
		inFlight.set(seq, task)
		dispatched += batch.length
		process.stdout.write(`\r${dispatched} processed, condemned=${condemned} errors=${errors}`)
		if (inFlight.size >= concurrency) await Promise.race(inFlight.values())
		// ~10 req/s per worker -> ~1000 DO wakes/s
		await new Promise((r) => setTimeout(r, 100 / concurrency))
	}

	let lineNo = 0
	let batch: string[] = []
	// Offset resume walks past error rows and never returns to them, so failures need
	// their own sweep: --retry-errors re-reads the ledger instead of the ids file.
	const source = retryErrors ? errorIdsFromLedger(resultsFile) : readLines(IDS_FILE)
	for await (const id of source) {
		if (!retryErrors && ++lineNo <= skipLines) continue
		if (lineNo - skipLines > limit) break
		batch.push(id)
		if (batch.length < BATCH) continue
		await dispatch(batch)
		batch = []
		if (fatal) break
	}
	if (batch.length && !fatal) await dispatch(batch)
	await Promise.all(inFlight.values())

	console.log('\n\nidle histogram (count / GB):')
	for (const k of ['<7d', '7-30d', '30-90d', '>90d']) {
		const h = hist[k]
		if (h)
			console.log(
				`  ${k.padEnd(7)} ${String(h.count).padStart(9)}  ${(h.bytes / 1e9).toFixed(2)} GB`
			)
	}
	console.log(`condemned=${condemned} errors=${errors}`)
	if (fatal !== undefined) throw new FatalError(fatal.message)
	if (errors > 0) process.exitCode = 1
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
