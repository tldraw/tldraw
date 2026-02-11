/**
 * SVG Scanner Worker
 *
 * Scans R2 buckets for malicious SVG files using Cloudflare Queues
 * to fan out the work across many invocations.
 *
 * HTTP endpoints:
 *   POST /scan?bucket=uploads[&prefix=...][&dryRun=true]
 *     Enumerates the bucket's objects and pushes batches onto the scan queue.
 *     Returns { queued: number, svgKeys: number }.
 *
 *   GET /results[?severity=high][&limit=100][&cursor=...]
 *     Returns flagged SVGs from the results KV store.
 *
 *   DELETE /results
 *     Clears all stored scan results.
 *
 * Queue consumer:
 *   Processes batches of R2 keys, fetches each SVG, runs pattern-matching
 *   scans, and writes flagged files to KV.
 */

import { type ScanResult, isSvgKey, scanSvgContent } from './scanner'

// ── Types ──────────────────────────────────────────────────────────

interface Environment {
	// R2 buckets
	UPLOADS: R2Bucket
	ROOMS: R2Bucket
	ROOM_SNAPSHOTS: R2Bucket
	// Queue
	SCAN_QUEUE: Queue<QueuePayload>
	// KV for results
	SCAN_RESULTS: KVNamespace
}

interface QueuePayload {
	bucket: string
	keys: string[]
}

type BucketName = 'uploads' | 'rooms' | 'room-snapshots'

const BUCKET_BINDINGS: Record<BucketName, keyof Pick<Environment, 'UPLOADS' | 'ROOMS' | 'ROOM_SNAPSHOTS'>> = {
	uploads: 'UPLOADS',
	rooms: 'ROOMS',
	'room-snapshots': 'ROOM_SNAPSHOTS',
}

/** Max keys per queue message. Keeps each consumer invocation fast. */
const BATCH_SIZE = 200

/** Max SVG file size to scan (5 MB). Anything larger is flagged automatically. */
const MAX_SCAN_SIZE = 5 * 1024 * 1024

// ── Worker ─────────────────────────────────────────────────────────

export default {
	async fetch(request: Request, env: Environment): Promise<Response> {
		const url = new URL(request.url)

		if (url.pathname === '/scan' && request.method === 'POST') {
			return handleScan(url, env)
		}

		if (url.pathname === '/results' && request.method === 'GET') {
			return handleGetResults(url, env)
		}

		if (url.pathname === '/results' && request.method === 'DELETE') {
			return handleClearResults(env)
		}

		return new Response('Not found. Endpoints: POST /scan, GET /results, DELETE /results', {
			status: 404,
		})
	},

	async queue(batch: MessageBatch<QueuePayload>, env: Environment): Promise<void> {
		for (const message of batch.messages) {
			try {
				await processQueueMessage(message.body, env)
				message.ack()
			} catch (err) {
				console.error(`[queue] Error processing message:`, err)
				message.retry()
			}
		}
	},
}

// ── HTTP: POST /scan ───────────────────────────────────────────────

async function handleScan(url: URL, env: Environment): Promise<Response> {
	const bucketName = (url.searchParams.get('bucket') ?? 'uploads') as BucketName
	const prefix = url.searchParams.get('prefix') ?? undefined
	const dryRun = url.searchParams.get('dryRun') === 'true'

	const bindingKey = BUCKET_BINDINGS[bucketName]
	if (!bindingKey) {
		return Response.json(
			{ error: `Unknown bucket "${bucketName}". Valid: ${Object.keys(BUCKET_BINDINGS).join(', ')}` },
			{ status: 400 }
		)
	}

	const bucket = env[bindingKey]
	let totalKeys = 0
	let svgKeys = 0
	let queued = 0
	let cursor: string | undefined

	// Paginate through the entire bucket
	do {
		const listResult = await bucket.list({
			prefix,
			cursor,
			limit: 1000,
		})

		// Collect SVG keys from this page
		const svgKeysInPage: string[] = []
		for (const obj of listResult.objects) {
			totalKeys++
			if (isSvgKey(obj.key) || obj.httpMetadata?.contentType?.includes('svg')) {
				svgKeysInPage.push(obj.key)
				svgKeys++
			}
		}

		// Batch SVG keys and push to queue
		if (!dryRun) {
			for (let i = 0; i < svgKeysInPage.length; i += BATCH_SIZE) {
				const batch = svgKeysInPage.slice(i, i + BATCH_SIZE)
				await env.SCAN_QUEUE.send({
					bucket: bucketName,
					keys: batch,
				})
				queued += batch.length
			}
		} else {
			queued += svgKeysInPage.length
		}

		cursor = listResult.truncated ? listResult.cursor : undefined

		console.log(
			`[scan] Listed page: ${listResult.objects.length} objects, ${svgKeysInPage.length} SVGs. ` +
				`Running total: ${totalKeys} objects, ${svgKeys} SVGs. Truncated: ${listResult.truncated}`
		)
	} while (cursor)

	const result = {
		bucket: bucketName,
		prefix: prefix ?? '(none)',
		totalObjectsScanned: totalKeys,
		svgKeysFound: svgKeys,
		queued,
		dryRun,
	}

	console.log(`[scan] Complete:`, JSON.stringify(result))
	return Response.json(result)
}

// ── HTTP: GET /results ─────────────────────────────────────────────

async function handleGetResults(url: URL, env: Environment): Promise<Response> {
	const severity = url.searchParams.get('severity') ?? undefined
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 1000)
	const cursor = url.searchParams.get('cursor') ?? undefined

	const listResult = await env.SCAN_RESULTS.list({
		prefix: 'flagged:',
		limit,
		cursor,
	})

	const results: ScanResult[] = []
	for (const key of listResult.keys) {
		const value = await env.SCAN_RESULTS.get(key.name, 'json')
		if (value) {
			const result = value as ScanResult
			if (severity) {
				// Filter by severity: include if any finding matches
				if (result.findings.some((f) => f.severity === severity)) {
					results.push(result)
				}
			} else {
				results.push(result)
			}
		}
	}

	return Response.json({
		results,
		count: results.length,
		cursor: listResult.list_complete ? null : listResult.cursor,
		complete: listResult.list_complete,
	})
}

// ── HTTP: DELETE /results ──────────────────────────────────────────

async function handleClearResults(env: Environment): Promise<Response> {
	let deleted = 0
	let cursor: string | undefined

	do {
		const listResult = await env.SCAN_RESULTS.list({
			prefix: 'flagged:',
			limit: 1000,
			cursor,
		})

		for (const key of listResult.keys) {
			await env.SCAN_RESULTS.delete(key.name)
			deleted++
		}

		cursor = listResult.list_complete ? undefined : listResult.cursor
	} while (cursor)

	// Also clear the summary
	await env.SCAN_RESULTS.delete('summary:latest')

	return Response.json({ deleted })
}

// ── Queue consumer ─────────────────────────────────────────────────

async function processQueueMessage(payload: QueuePayload, env: Environment): Promise<void> {
	const { bucket: bucketName, keys } = payload
	const bindingKey = BUCKET_BINDINGS[bucketName as BucketName]
	if (!bindingKey) {
		console.error(`[queue] Unknown bucket: ${bucketName}`)
		return
	}

	const r2 = env[bindingKey]
	let scanned = 0
	let flagged = 0

	for (const key of keys) {
		try {
			const result = await scanOneObject(r2, bucketName, key)
			scanned++

			if (result && result.findings.length > 0) {
				flagged++
				// Store in KV. Key uses the bucket and object key for deduplication.
				const kvKey = `flagged:${bucketName}:${key}`
				await env.SCAN_RESULTS.put(kvKey, JSON.stringify(result), {
					// Expire after 90 days
					expirationTtl: 90 * 24 * 60 * 60,
				})

				const severities = result.findings.map((f) => f.severity)
				const maxSeverity = severities.includes('high') ? 'HIGH' : 'MEDIUM'
				console.warn(
					`[FLAGGED ${maxSeverity}] ${bucketName}/${key} — ` +
						result.findings.map((f) => f.rule).join(', ')
				)
			}
		} catch (err) {
			console.error(`[queue] Error scanning ${bucketName}/${key}:`, err)
		}
	}

	console.log(`[queue] Batch done: scanned=${scanned}, flagged=${flagged} out of ${keys.length} keys`)

	// Update running summary
	await updateSummary(env, scanned, flagged)
}

async function scanOneObject(
	bucket: R2Bucket,
	bucketName: string,
	key: string
): Promise<ScanResult | null> {
	const obj = await bucket.get(key)
	if (!obj) {
		console.log(`[scan] Object not found (may have been deleted): ${bucketName}/${key}`)
		return null
	}

	const size = obj.size

	// If the file is too large, flag it as suspicious rather than trying to scan
	if (size > MAX_SCAN_SIZE) {
		return {
			key,
			bucket: bucketName,
			findings: [
				{
					rule: 'oversized-svg',
					severity: 'medium',
					description: `SVG file is ${(size / 1024 / 1024).toFixed(1)} MB, exceeding the ${MAX_SCAN_SIZE / 1024 / 1024} MB scan limit`,
					match: `size=${size}`,
				},
			],
			scannedAt: new Date().toISOString(),
			sizeBytes: size,
		}
	}

	const content = await obj.text()
	const findings = scanSvgContent(content)

	if (findings.length === 0) {
		return null
	}

	return {
		key,
		bucket: bucketName,
		findings,
		scannedAt: new Date().toISOString(),
		sizeBytes: size,
	}
}

// ── Summary tracking ───────────────────────────────────────────────

interface ScanSummary {
	totalScanned: number
	totalFlagged: number
	lastUpdated: string
}

async function updateSummary(env: Environment, scanned: number, flagged: number): Promise<void> {
	// Best-effort summary update (race conditions possible but acceptable for monitoring)
	const existing = await env.SCAN_RESULTS.get('summary:latest', 'json')
	const summary: ScanSummary = (existing as ScanSummary) ?? {
		totalScanned: 0,
		totalFlagged: 0,
		lastUpdated: '',
	}

	summary.totalScanned += scanned
	summary.totalFlagged += flagged
	summary.lastUpdated = new Date().toISOString()

	await env.SCAN_RESULTS.put('summary:latest', JSON.stringify(summary))
}
