import type { TabRenderRequest } from '@tldraw/dotcom-shared'
import { vi } from 'vitest'
import type { TabRenderOutcome } from '../../tabRenderBroker'
import { Environment } from '../../types'

// Shared fakes for the Browser Run thumbnail / OG image tests (thumbnailRender,
// mcpServer, ogImageQueue, getOgImage). The R2/browser/queue fakes, snapshot builder
// and token helpers belong here rather than in any one test file, so that all four exercise the same
// stand-ins.

// Builds a room snapshot with the given pages and per-page shape counts. Shapes are parented
// directly to their page, which is what enumerateBoardPages checks for "has content".
export function makeSnapshot(
	pages: Array<{ id: string; index: string; name?: string; shapes: number }>,
	boardName: string | null = 'My Board'
) {
	const documents: Array<{ state: any }> = [
		{ state: { typeName: 'document', id: 'document:document', name: boardName ?? '' } },
	]
	for (const page of pages) {
		documents.push({
			state: { typeName: 'page', id: page.id, name: page.name, index: page.index },
		})
		for (let i = 0; i < page.shapes; i++) {
			documents.push({
				state: {
					typeName: 'shape',
					id: `shape:${page.id}-${i}`,
					parentId: page.id,
					type: 'geo',
					x: i * 100,
					y: 0,
					rotation: 0,
					props: { w: 80, h: 80 },
				},
			})
		}
	}
	return { documents, schema: { schemaVersion: 2, sequences: {} } } as any
}

// In-memory stand-in for an R2 bucket such as THUMBNAILS.
// Exposes `store` so tests can inspect or seed
// entries directly. Covers get/head/put/delete; entries carry the customMetadata and upload time
// the routes read.
export function makeFakeThumbnailsBucket() {
	const store = new Map<
		string,
		{ body: ArrayBuffer; customMetadata?: Record<string, string>; uploaded: Date; etag: string }
	>()
	// R2 exposes an object's etag twice: `etag` bare and `httpEtag` quoted for the header. The OG route
	// compares against the first and sends the second, so the fake has to carry both. The value only
	// has to change when the bytes do, which a counter gives without hashing anything.
	let version = 0
	const etagOf = (value: { etag: string }) => ({ etag: value.etag, httpEtag: `"${value.etag}"` })
	return {
		store,
		async get(key: string) {
			const value = store.get(key)
			if (!value) return null
			return {
				customMetadata: value.customMetadata,
				uploaded: value.uploaded,
				...etagOf(value),
				body: value.body,
				arrayBuffer: async () => value.body,
				// R2 objects expose both; the render-result read uses text, the PNG cache uses bytes.
				text: async () => new TextDecoder().decode(value.body),
			}
		},
		async head(key: string) {
			const value = store.get(key)
			if (!value) return null
			return { customMetadata: value.customMetadata, uploaded: value.uploaded, ...etagOf(value) }
		},
		async put(
			key: string,
			body: ArrayBuffer | string,
			options?: { customMetadata?: Record<string, string> }
		) {
			store.set(key, {
				// Real R2 accepts a string body; normalize so arrayBuffer() and text() both work
				// whichever form the caller used.
				body: typeof body === 'string' ? new TextEncoder().encode(body).buffer : body,
				customMetadata: options?.customMetadata,
				uploaded: new Date(Date.now()),
				etag: `etag-${++version}`,
			})
		},
		async delete(key: string) {
			store.delete(key)
		},
		// Prefix listing, which the render-token cleanup uses now that a board's records are spread
		// across one key per surface (and, for MCP, per page and theme). `truncated` is always false:
		// the real bucket paginates at 1000 and a board never approaches that.
		async list({ prefix = '' }: { prefix?: string } = {}) {
			return {
				truncated: false as const,
				objects: [...store.keys()]
					.filter((key) => key.startsWith(prefix))
					.map((key) => ({ key, ...etagOf(store.get(key)!) })),
			}
		},
	}
}

// In-memory stand-in for the ROOMS bucket. Only `head` is used (to read the persisted snapshot's
// etag); pass `null` to simulate a room with no persisted snapshot.
export function makeFakeRoomsBucket(etag: string | null = 'room-etag-1') {
	return {
		async head(_key: string) {
			return etag === null ? null : { etag }
		},
	}
}

// The BROWSER binding's `.quickAction('screenshot', body)` returns a Response whose body is the PNG
// bytes. [1,2,3] base64-encodes to AQID. Pass a custom impl to simulate failures.
export function makeBrowserBinding(
	screenshot: (body: any) => Promise<Response> = async () =>
		new Response(new Uint8Array([1, 2, 3]), { status: 200 })
) {
	return { quickAction: vi.fn((_action: string, body: any) => screenshot(body)) }
}

export function makeFakeQueue() {
	return { send: vi.fn(async (_message: unknown) => undefined) }
}

// Stands in for the file's durable object: the fake answers the calls the MCP tools make of it.
export function makeFakeFileDurableObjectNamespace(
	requestTabRender: (
		userId: string,
		request: TabRenderRequest
	) => Promise<TabRenderOutcome> = async () => ({ status: 'no_tab' }),
	room: { getMcpLivePage?: unknown; getMcpBoardUsers?: unknown } = {}
) {
	return {
		// A legible id rather than an opaque hash, so an assertion that reaches one reads as `do(<name>)`.
		idFromName: (name: string) => ({ toString: () => `do(${name})` }),
		get: () => ({ requestTabRender, ...room }),
	}
}

export function makeScreenshotTestEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		BROWSER: makeBrowserBinding(),
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		QUEUE: makeFakeQueue(),
		TLDR_DOC: makeFakeFileDurableObjectNamespace(),
		...overrides,
	} as unknown as Environment
}

export function screenshotOf(env: Environment) {
	return (env.BROWSER as any).quickAction as ReturnType<typeof vi.fn>
}

// The datapoints for one event name (blob1). The MCP route writes two events per screenshot tool
// call — the render ledger (`mcp_shared_board_screenshot`, request-level) and the spend ledger
// (`browser_run_session`, one per browser session) — and they share prefixes (`reason:`), so a test
// asserting on one has to say which.
export function datapointsNamed(
	env: Environment,
	name: string
): Array<{ blobs: string[]; doubles: number[] }> {
	const points: Array<{ blobs: string[]; doubles: number[] }> = (
		env.MEASURE as any
	).writeDataPoint.mock.calls.map((call: any[]) => call[0])
	return points.filter((point) => point.blobs[0] === name)
}

// Pulls the `<prefix>:…` telemetry blob out of every request-level datapoint, so tests can assert on
// the low-cardinality dimensions (failure reason codes, and the caller recorded only on failures)
// without depending on the order of the blobs array.
export function blobsWithPrefix(env: Environment, prefix: string): string[] {
	return datapointsNamed(env, 'mcp_shared_board_screenshot')
		.map((point) => point.blobs.find((blob) => blob.startsWith(prefix)))
		.filter(Boolean) as string[]
}

// The `<prefix>:…` blobs of one event's datapoints, with the prefix stripped, in write order.
export function blobValuesOf(env: Environment, name: string, prefix: string): string[] {
	return datapointsNamed(env, name)
		.map((point) => point.blobs.find((blob) => blob.startsWith(`${prefix}:`)))
		.filter((blob): blob is string => Boolean(blob))
		.map((blob) => blob.slice(prefix.length + 1))
}

export function failureBlobsOf(env: Environment) {
	return blobsWithPrefix(env, 'failure:')
}

export function callerBlobsOf(env: Environment) {
	return blobsWithPrefix(env, 'caller:')
}

// Every browser_run_session datapoint, parsed for whole-object assertions: one entry per browser
// session actually created, in creation order. `durationMs` is that session's own wall-clock —
// request rows carry no durations at all under the split ledger.
export function sessionsOf(env: Environment): Array<{
	source: string
	mode: string
	outcome: string
	reason: string
	page: string
	durationMs: number
	browserMsUsed: number
	/** records, page shapes, media assets, bbox width, bbox height */
	content: number[]
}> {
	return datapointsNamed(env, 'browser_run_session').map((point) => {
		const value = (prefix: string) =>
			point.blobs.find((blob) => blob.startsWith(prefix))!.slice(prefix.length)
		return {
			source: value('source:'),
			mode: value('mode:'),
			outcome: value('outcome:'),
			reason: value('reason:'),
			page: value('page:'),
			durationMs: point.doubles[2],
			browserMsUsed: point.doubles[3],
			content: point.doubles.slice(4, 9),
		}
	})
}

// The index (index1) of every datapoint written. Always `undefined`, since the dataset carries no
// board identity — this exists to pin that, not to read a value out.
export function indexesOf(env: Environment): (string | undefined)[] {
	return (env.MEASURE as any).writeDataPoint.mock.calls.map(
		(call: any[]) => (call[0].indexes as [string] | undefined)?.[0]
	)
}

// quickAction is called as quickAction('screenshot', body); the render URL rides in body (arg 1).
export function tokenFromScreenshot(env: Environment): string {
	const body = screenshotOf(env).mock.calls[0]![1] as { url: string }
	return new URL(body.url).searchParams.get('token')!
}
