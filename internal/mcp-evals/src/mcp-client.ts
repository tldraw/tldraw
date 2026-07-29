import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolCallRecord } from './types.js'

/**
 * JSON-RPC client for the tldraw.com board MCP server (`POST /api/app/mcp`).
 *
 * The server is plain request/response JSON-RPC — no SSE, no session handshake —
 * so this is a thin fetch wrapper. What it is *not* thin about is rate limiting.
 *
 * The server allows roughly two `get_shared_board_screenshot` calls and two
 * `get_board_info` calls per minute per IP, plus a per-board cap on cache misses.
 * Crucially it reports a breach as a *successful* tool result with `isError: true`
 * and text starting "Rate limited" — so an agent left to see it will either burn a
 * turn retrying or give up and answer from nothing. Either way the eval measures
 * the limiter instead of the agent.
 *
 * This client therefore (a) paces calls to stay under the limit, (b) swallows and
 * retries the rate-limit errors that get through, and (c) records how often that
 * happened, so a slow run is legible as throttling rather than agent latency.
 */

export interface McpToolResult {
	content: { type: string; text?: string; data?: string; mimeType?: string }[]
	isError?: boolean
}

export interface McpClientOptions {
	endpoint: string
	/** Minimum gap between screenshot calls. The server's budget is ~2/min per IP. */
	screenshotIntervalMs?: number
	/** Minimum gap between board-info calls. Metered separately by the server. */
	boardInfoIntervalMs?: number
	/** How many times to absorb a rate-limit response before surfacing it. */
	maxRateLimitRetries?: number
	/**
	 * Directory for the on-disk screenshot cache. Repeat runs of the same task hit
	 * this instead of the network, which is the difference between a 40-minute
	 * suite and a 4-minute one. Cached calls are flagged so their timings are never
	 * mistaken for real ones.
	 */
	cacheDir?: string
	/** Set false for a true end-to-end timing run. */
	useCache?: boolean
	log?(message: string): void
}

const RATE_LIMIT_MARKER = /^rate limited/i

export class McpClient {
	private readonly endpoint: string
	private readonly screenshotIntervalMs: number
	private readonly boardInfoIntervalMs: number
	private readonly maxRateLimitRetries: number
	private readonly cacheDir?: string
	private readonly useCache: boolean
	private readonly log: (message: string) => void

	/** Per-tool timestamp of the last network call, for pacing. */
	private lastCallAt = new Map<string, number>()
	/** Serializes calls so pacing holds even if an agent fires tools in parallel. */
	private queue: Promise<unknown> = Promise.resolve()
	private nextId = 1

	/** Calls made during the current attempt. Reset by `beginAttempt()`. */
	calls: ToolCallRecord[] = []

	constructor(options: McpClientOptions) {
		this.endpoint = options.endpoint
		// Default to a hair over 30s: two calls a minute is the documented budget,
		// and pacing under it is far cheaper than retrying over it.
		this.screenshotIntervalMs = options.screenshotIntervalMs ?? 31_000
		this.boardInfoIntervalMs = options.boardInfoIntervalMs ?? 31_000
		this.maxRateLimitRetries = options.maxRateLimitRetries ?? 4
		this.cacheDir = options.cacheDir
		this.useCache = options.useCache ?? true
		this.log = options.log ?? (() => {})
	}

	beginAttempt() {
		this.calls = []
	}

	/** Wall time spent on calls that actually hit the network. */
	getNetworkMs() {
		return this.calls.reduce((sum, call) => sum + (call.fromLocalCache ? 0 : call.durationMs), 0)
	}

	getRateLimitRetries() {
		return this.calls.reduce((sum, call) => sum + call.rateLimitRetries, 0)
	}

	getUsedLocalCache() {
		return this.calls.some((call) => call.fromLocalCache)
	}

	async initialize() {
		return this.rpc('initialize', {})
	}

	async listTools(): Promise<{
		tools: { name: string; description: string; inputSchema: unknown }[]
	}> {
		return (await this.rpc('tools/list', {})) as never
	}

	/**
	 * Call a tool, absorbing rate limits. Serialized against every other call on
	 * this client so the pacing above is actually honoured.
	 */
	callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
		const run = this.queue.then(
			() => this.callToolInner(name, args),
			() => this.callToolInner(name, args)
		)
		// Keep the chain alive even when a call rejects, or one failure wedges the queue.
		this.queue = run.catch(() => {})
		return run
	}

	private async callToolInner(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
		const started = Date.now()

		const cacheKey = this.cacheKeyFor(name, args)
		if (cacheKey) {
			const cached = await this.readCache(cacheKey)
			if (cached) {
				this.calls.push({
					name,
					args,
					durationMs: Date.now() - started,
					ok: !cached.isError,
					rateLimitRetries: 0,
					fromLocalCache: true,
				})
				return cached
			}
		}

		let rateLimitRetries = 0
		let result: McpToolResult | undefined

		for (let attempt = 0; ; attempt++) {
			await this.waitForSlot(name)
			this.lastCallAt.set(name, Date.now())

			result = (await this.rpc('tools/call', { name, arguments: args })) as McpToolResult

			if (!isRateLimited(result) || rateLimitRetries >= this.maxRateLimitRetries) break

			rateLimitRetries++
			// Exponential backoff on top of the pacing gap: a breach means our pacing
			// estimate is wrong for this window, so back further off rather than
			// re-testing the limit at the same cadence.
			const backoff = this.intervalFor(name) * 2 ** attempt
			this.log(`  rate limited on ${name}, backing off ${Math.round(backoff / 1000)}s`)
			await sleep(backoff)
		}

		this.calls.push({
			name,
			args,
			durationMs: Date.now() - started,
			ok: !result!.isError,
			rateLimitRetries,
			fromLocalCache: false,
		})

		// Only successful screenshots are worth caching; an error is cheap to re-fetch
		// and caching one would freeze a transient failure into every later run.
		if (cacheKey && !result!.isError) await this.writeCache(cacheKey, result!)

		return result!
	}

	private intervalFor(name: string) {
		return name === 'get_board_info' ? this.boardInfoIntervalMs : this.screenshotIntervalMs
	}

	private async waitForSlot(name: string) {
		const last = this.lastCallAt.get(name)
		if (last === undefined) return
		const wait = last + this.intervalFor(name) - Date.now()
		if (wait > 0) {
			this.log(`  pacing ${name}: waiting ${Math.round(wait / 1000)}s`)
			await sleep(wait)
		}
	}

	private cacheKeyFor(name: string, args: Record<string, unknown>) {
		if (!this.useCache || !this.cacheDir) return undefined
		// Both tools are declared read-only and idempotent, and both are keyed
		// entirely by their arguments, so the argument hash is a sound cache key.
		const hash = createHash('sha256')
			.update(`${name}:${stableStringify(args)}`)
			.digest('hex')
		return `${name}-${hash.slice(0, 24)}.json`
	}

	private async readCache(key: string): Promise<McpToolResult | undefined> {
		try {
			const raw = await readFile(join(this.cacheDir!, key), 'utf8')
			return JSON.parse(raw) as McpToolResult
		} catch {
			return undefined
		}
	}

	private async writeCache(key: string, result: McpToolResult) {
		try {
			await mkdir(this.cacheDir!, { recursive: true })
			await writeFile(join(this.cacheDir!, key), JSON.stringify(result), 'utf8')
		} catch (error) {
			// A cache that cannot absorb writes only costs speed, never correctness.
			this.log(`  cache write failed: ${describeError(error)}`)
		}
	}

	private async rpc(method: string, params: Record<string, unknown>): Promise<unknown> {
		const body = JSON.stringify({ jsonrpc: '2.0', id: this.nextId++, method, params })
		const response = await fetch(this.endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
		})

		if (!response.ok) {
			throw new Error(`MCP ${method} failed: HTTP ${response.status} ${response.statusText}`)
		}

		const payload = (await response.json()) as {
			result?: unknown
			error?: { code: number; message: string }
		}
		if (payload.error) {
			throw new Error(`MCP ${method} error ${payload.error.code}: ${payload.error.message}`)
		}
		return payload.result
	}
}

function isRateLimited(result: McpToolResult) {
	if (!result.isError) return false
	return result.content.some((block) => block.text && RATE_LIMIT_MARKER.test(block.text.trim()))
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Key order must not change the cache key, or repeat runs silently miss. */
function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value)
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
	const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
		a < b ? -1 : a > b ? 1 : 0
	)
	return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

export function describeError(error: unknown) {
	return error instanceof Error ? error.message : String(error)
}
