import type { ScreenshotRequest, ScreenshotResult } from '@tldraw/dotcom-render-worker'
import type { TabRenderRequest } from '@tldraw/dotcom-shared'
import { vi } from 'vitest'
import type { TabRenderOutcome } from '../../tabRenderBroker'
import { Environment } from '../../types'

// Shared fakes for the Browser Run thumbnail / OG image tests (thumbnailRender,
// mcpServer, ogImageQueue, getOgImage). The R2/render-worker/queue fakes and the snapshot builder
// belong here rather than in any one test file, so that all four exercise the same stand-ins.

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

// The RENDER_WORKER binding's `screenshot()` answers with the PNG bytes, or a bounded failure reason.
// [1,2,3] base64-encodes to AQID. Pass a custom impl to simulate failures.
export function makeRenderWorkerBinding(
	screenshot: (request: ScreenshotRequest) => Promise<ScreenshotResult> = async () => ({
		ok: true,
		png: new Uint8Array([1, 2, 3]),
	})
) {
	return { screenshot: vi.fn(screenshot) }
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
	room: Record<string, unknown> = {}
) {
	return {
		// A legible id rather than an opaque hash, so an assertion that reaches one reads as `do(<name>)`.
		idFromName: (name: string) => ({ toString: () => `do(${name})` }),
		// Drops the minted job ids: they're random, and the broker tests cover how they're issued.
		get: () => ({
			requestTabRender: (userId: string, request: TabRenderRequest) =>
				requestTabRender(userId, request),
			...room,
		}),
	}
}

export function makeScreenshotTestEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		// Empty: every flag reads as its default.
		FEATURE_FLAGS: { get: async () => null },
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		QUEUE: makeFakeQueue(),
		RENDER_WORKER: makeRenderWorkerBinding(),
		TLDR_DOC: makeFakeFileDurableObjectNamespace(),
		...overrides,
	} as unknown as Environment
}

export function screenshotOf(env: Environment) {
	return (env.RENDER_WORKER as any).screenshot as ReturnType<
		typeof makeRenderWorkerBinding
	>['screenshot']
}

// The datapoints for one event name (blob1). Events share prefixes (`reason:`), so a test asserting
// on one has to say which.
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

// The index (index1) of every datapoint written. Always `undefined`, since the dataset carries no
// board identity — this exists to pin that, not to read a value out.
export function indexesOf(env: Environment): (string | undefined)[] {
	return (env.MEASURE as any).writeDataPoint.mock.calls.map(
		(call: any[]) => (call[0].indexes as [string] | undefined)?.[0]
	)
}
