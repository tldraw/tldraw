import { vi } from 'vitest'
import { Environment } from '../../types'

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
				state: { typeName: 'shape', id: `shape:${page.id}-${i}`, parentId: page.id },
			})
		}
	}
	return { documents, schema: { schemaVersion: 2, sequences: {} } } as any
}

// In-memory stand-in for an R2 bucket (THUMBNAILS or MCP_SCREENSHOTS, which have the same shape).
// Exposes `store` so tests can inspect or seed
// entries directly. Covers get/head/put/delete; entries carry the customMetadata and upload time
// the routes read.
export function makeFakeThumbnailsBucket() {
	const store = new Map<
		string,
		{ body: ArrayBuffer; customMetadata?: Record<string, string>; uploaded: Date }
	>()
	return {
		store,
		async get(key: string) {
			const value = store.get(key)
			if (!value) return null
			return {
				customMetadata: value.customMetadata,
				uploaded: value.uploaded,
				arrayBuffer: async () => value.body,
			}
		},
		async head(key: string) {
			const value = store.get(key)
			if (!value) return null
			return { customMetadata: value.customMetadata, uploaded: value.uploaded }
		},
		async put(
			key: string,
			body: ArrayBuffer,
			options?: { customMetadata?: Record<string, string> }
		) {
			store.set(key, {
				body,
				customMetadata: options?.customMetadata,
				uploaded: new Date(Date.now()),
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

export function makeScreenshotTestEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		BROWSER: makeBrowserBinding(),
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		QUEUE: makeFakeQueue(),
		// Nothing in the thumbnail pipeline derives a board id, and this exists to keep it that way: if
		// something starts, a legible `do(<name>)` shows up in an assertion rather than an opaque hash.
		TLDR_DOC: { idFromName: (name: string) => ({ toString: () => `do(${name})` }) },
		...overrides,
	} as unknown as Environment
}

export function screenshotOf(env: Environment) {
	return (env.BROWSER as any).quickAction as ReturnType<typeof vi.fn>
}

// Pulls the `<prefix>:…` telemetry blob out of every writeDataPoint call, so tests can assert on the
// low-cardinality dimensions (failure reason codes, and the IP recorded only on failures) without
// depending on the order of the blobs array.
export function blobsWithPrefix(env: Environment, prefix: string): string[] {
	return (env.MEASURE as any).writeDataPoint.mock.calls
		.map((call: any[]) => (call[0].blobs as string[]).find((blob) => blob.startsWith(prefix)))
		.filter(Boolean)
}

export function failureBlobsOf(env: Environment) {
	return blobsWithPrefix(env, 'failure:')
}

export function ipBlobsOf(env: Environment) {
	return blobsWithPrefix(env, 'ip:')
}

// The Browser Run duration (double3) of every datapoint written. -1 is the sentinel for "no browser
// was spent", which is what separates a failure that never reached the capture from one that created
// a browser and held it — a distinction the spend ledger would otherwise lose on every failed render.
export function renderDurationsOf(env: Environment): number[] {
	return (env.MEASURE as any).writeDataPoint.mock.calls.map(
		(call: any[]) => (call[0].doubles as number[])[2]
	)
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
