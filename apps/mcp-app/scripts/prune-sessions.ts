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
 *      MCP_WORKER_ORIGIN (default https://tldraw-mcp-app.tldraw.workers.dev), MCP_ADMIN_TOKEN (prune).
 */
/* eslint-disable no-console */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { MIN_SAFE_IDLE_MS } from '../src/prune'

const IDS_FILE = 'prune-ids.txt'
const RESULTS_FILE = 'prune-results.jsonl'
const DRY_RUN_RESULTS_FILE = 'prune-dry-run.jsonl'
const BATCH = 100
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
	const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
		headers: { Authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}` },
	})
	const json: any = await res.json()
	if (!json.success) throw new Error(`CF API ${path}: ${JSON.stringify(json.errors)}`)
	return json
}

async function list(): Promise<void> {
	const account = env('CLOUDFLARE_ACCOUNT_ID')
	// Page-based (unlike the objects endpoint); every preview worker owns namespaces,
	// so the account is well past one page.
	let ns: any
	for (let page = 1; !ns; page++) {
		const res = await cf(
			`/accounts/${account}/workers/durable_objects/namespaces?page=${page}&per_page=100`
		)
		ns = res.result.find((n: any) => n.class === 'TldrawMCP' && n.script === 'tldraw-mcp-app')
		if (res.result.length < 100) break
	}
	if (!ns) throw new Error('TldrawMCP namespace not found for script tldraw-mcp-app')
	console.log(`namespace ${ns.id}`)
	writeFileSync(IDS_FILE, '')
	let cursor: string | undefined
	let total = 0
	let withData = 0
	do {
		const q = new URLSearchParams({ limit: '1000' })
		if (cursor) q.set('cursor', cursor)
		const page = await cf(
			`/accounts/${account}/workers/durable_objects/namespaces/${ns.id}/objects?${q}`
		)
		const ids = page.result.filter((o: any) => o.hasStoredData).map((o: any) => o.id)
		total += page.result.length
		withData += ids.length
		if (ids.length) appendFileSync(IDS_FILE, ids.join('\n') + '\n')
		cursor = page.result_info?.cursor || undefined
		process.stdout.write(`\rlisted ${total} (with data ${withData})`)
	} while (cursor)
	console.log(`\nwrote ${withData} ids to ${IDS_FILE}`)
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
	const origin = env('MCP_WORKER_ORIGIN', 'https://tldraw-mcp-app.tldraw.workers.dev')
	const token = env('MCP_ADMIN_TOKEN')

	const resultsFile = dryRun ? DRY_RUN_RESULTS_FILE : RESULTS_FILE
	const done = new Set<string>()
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
	if (existsSync(resultsFile)) {
		for (const line of readFileSync(resultsFile, 'utf8').split('\n')) {
			if (!line) continue
			const r = JSON.parse(line)
			// Dry run: nothing is terminal, any prior non-error row already answered "what
			// would happen". Real run: only destroy-scheduled is terminal; kept ids may cross
			// a later, longer --max-idle threshold and must be re-evaluated.
			const skip = dryRun ? !r.error : r.action === 'destroy-scheduled'
			if (!skip) continue
			done.add(r.id)
			// Skipped rows still count, so a resumed or re-run invocation reports the
			// whole file rather than just the remainder. Re-evaluated rows are tallied
			// when their fresh result lands.
			tally(r)
		}
	}
	const ids = readFileSync(IDS_FILE, 'utf8')
		.split('\n')
		.filter((l) => l && !done.has(l))
	console.log(
		`${ids.length} ids to process (${done.size} already ${dryRun ? 'evaluated' : 'condemned'}), dryRun=${dryRun}, maxIdle=${maxIdleMs}ms`
	)

	let processed = 0
	const batches: string[][] = []
	for (let i = 0; i < ids.length; i += BATCH) batches.push(ids.slice(i, i + BATCH))

	async function runBatch(batch: string[]) {
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
		for (const r of results) {
			appendFileSync(resultsFile, JSON.stringify(r) + '\n')
			tally(r)
		}
		processed += batch.length
		process.stdout.write(`\r${processed}/${ids.length} condemned=${condemned} errors=${errors}`)
	}

	let next = 0
	let fatal: FatalError | undefined
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			while (next < batches.length && !fatal) {
				const b = batches[next++]
				try {
					await runBatch(b)
				} catch (err) {
					if (err instanceof FatalError) {
						fatal = err
						break
					}
					errors += b.length
					console.error(`\nbatch failed: ${String(err)}`)
				}
				await new Promise((r) => setTimeout(r, 100)) // ~10 req/s per worker -> ~1000 DO wakes/s
			}
		})
	)
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
		? list()
		: cmd === 'prune'
			? prune(rest)
			: Promise.reject(new Error('usage: list | prune'))
run.catch((err) => {
	console.error(err.message ?? err)
	process.exit(1)
})
