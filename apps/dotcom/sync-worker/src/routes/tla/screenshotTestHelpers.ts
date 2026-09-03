import { vi } from 'vitest'
import { Environment } from '../../types'
import { base64UrlDecode } from '../../utils/base64'

// Shared fakes for the Browser Run thumbnail / OG image tests (thumbnailRender,
// sharedBoardScreenshotMcp, ogImageQueue, getOgImage). The R2/browser/queue fakes, snapshot builder
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

// In-memory stand-in for an R2 bucket (THUMBNAILS or MCP_DATA_BUCKET, which have the same shape).
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

// Stands in for the render page on a `measure` job: a real one POSTs its measurements to
// /app/thumbnail-render/result before signalling ready, so the fake writes them to the same place
// the worker reads from. Without this every clustering tool would fail on a missing result, since
// they all measure the page before clustering it.
export function makeMeasuringBrowserBinding(
	env: () => Environment,
	bounds: Record<
		string,
		{ minX: number; minY: number; maxX: number; maxY: number; text?: string }
	> = {}
) {
	return makeBrowserBinding(async (body: any) => {
		const token = new URL(body.url).searchParams.get('token')
		const job = token
			? JSON.parse(new TextDecoder().decode(base64UrlDecode(token.split('.')[0])))
			: null
		if (job?.mode === 'measure') {
			await (env().THUMBNAILS as R2Bucket).put(
				`render-result/${encodeURIComponent(token!)}.json`,
				JSON.stringify(bounds)
			)
		}
		return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
	})
}

// In-memory stand-in for the TLDR_DOC namespace, with the file object's MCP cluster index storage.
//
// One store per object id, because that is the property the design rests on: the index key carries no
// slug precisely because each file has its own object, so a fake that pooled every file into one
// store could not tell a right `fileId` from a wrong one.
//
// Within a store, rows are keyed the way the real table is — (kind, pageId), with the version held as
// a value rather than part of the key — so a write for new content replaces the old row exactly as
// `INSERT OR REPLACE` does, a read for a stale version misses, and a write prunes the pages the board
// no longer has. mcpClusterIndexStorage.test.ts is what holds this fake to the real statements.
export function makeFakeFileDurableObjectNamespace() {
	const objects = new Map<string, Map<string, { version: string; payload: string }>>()
	const calls = { get: 0, put: 0 }
	const keyOf = (key: { kind: string; pageId: string }) => `${key.kind}/${key.pageId}`
	const storeFor = (id: string) => {
		const existing = objects.get(id)
		if (existing) return existing
		const created = new Map<string, { version: string; payload: string }>()
		objects.set(id, created)
		return created
	}

	return {
		objects,
		calls,
		// A legible id rather than an opaque hash, so an assertion that reaches one reads as `do(<name>)`.
		idFromName: (name: string) => ({ toString: () => `do(${name})` }),
		get: (id: { toString(): string }) => {
			const store = storeFor(String(id))
			return {
				async getMcpClusterIndex(key: any) {
					calls.get++
					const row = store.get(keyOf(key))
					return row && row.version === key.version ? row.payload : null
				},
				async putMcpClusterIndex(key: any, payload: string, livePageIds: string[]) {
					calls.put++
					for (const existing of [...store.keys()]) {
						const [kind, pageId] = existing.split('/')
						if (kind === key.kind && !livePageIds.includes(pageId)) store.delete(existing)
					}
					store.set(keyOf(key), { version: key.version, payload })
				},
			}
		},
	}
}

export function makeScreenshotTestEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		BROWSER: makeBrowserBinding(),
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		QUEUE: makeFakeQueue(),
		// The MCP cluster index cache lives on the file's durable object, so the default env has a
		// working one: a test that measures twice for the same board and page is asserting that the
		// cache did not hold, which is worth failing on rather than passing by accident.
		TLDR_DOC: makeFakeFileDurableObjectNamespace(),
		...overrides,
	} as unknown as Environment
}

/** The fake TLDR_DOC namespace an env was built with, for tests that assert on cache traffic. */
export function clusterIndexStoreOf(env: Environment) {
	return env.TLDR_DOC as unknown as ReturnType<typeof makeFakeFileDurableObjectNamespace>
}

/** Every cluster index row an env holds, as `<object>|<kind>/<pageId>`, for whole-store assertions. */
export function clusterIndexKeysOf(env: Environment) {
	return [...clusterIndexStoreOf(env).objects].flatMap(([id, store]) =>
		[...store.keys()].map((key) => `${id}|${key}`)
	)
}

export function screenshotOf(env: Environment) {
	return (env.BROWSER as any).quickAction as ReturnType<typeof vi.fn>
}

// Datapoints of one event, told apart by blob1: `mcp_shared_board_screenshot` rows are
// request-level (cache and refusals), `browser_run_session` rows are one per browser session (the
// spend ledger).
function datapointsOfEvent(
	env: Environment,
	eventName: string
): Array<{ blobs: string[]; doubles: number[] }> {
	return (env.MEASURE as any).writeDataPoint.mock.calls
		.map((call: any[]) => call[0] as { blobs: string[]; doubles: number[] })
		.filter((point: { blobs: string[] }) => point.blobs[0] === eventName)
}

// Pulls the `<prefix>:…` telemetry blob out of every request-level datapoint, so tests can assert on
// the low-cardinality dimensions (failure reason codes, and the caller recorded only on failures)
// without depending on the order of the blobs array.
export function blobsWithPrefix(env: Environment, prefix: string): string[] {
	return datapointsOfEvent(env, 'mcp_shared_board_screenshot')
		.map((point) => point.blobs.find((blob) => blob.startsWith(prefix)))
		.filter(Boolean) as string[]
}

// The datapoints for one event name (blob1). The MCP route writes two events per screenshot tool
// call — the render ledger and the protocol-level tool call — and they share prefixes (`reason:`), so
// a test asserting on one has to say which.
export function datapointsNamed(
	env: Environment,
	name: string
): { blobs: string[]; doubles?: number[] }[] {
	return (env.MEASURE as any).writeDataPoint.mock.calls
		.map((call: any[]) => call[0])
		.filter((point: any) => (point.blobs as string[])[0] === name)
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
export function sessionsOf(
	env: Environment
): Array<{ source: string; mode: string; outcome: string; reason: string; durationMs: number }> {
	return datapointsOfEvent(env, 'browser_run_session').map((point) => {
		const value = (prefix: string) =>
			point.blobs.find((blob) => blob.startsWith(prefix))!.slice(prefix.length)
		return {
			source: value('source:'),
			mode: value('mode:'),
			outcome: value('outcome:'),
			reason: value('reason:'),
			durationMs: point.doubles[2],
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
