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

// Stand-in for the postgres module, for tests that fake the Postgres seam rather than mocking the
// reader on top of it (getSharedFile.test.ts, getPublishedFile.test.ts — pass it to
// `vi.mock('../../postgres', ...)`). The Kysely chain is self-returning, so a reader's builder
// calls all land on the one `executeTakeFirst` — which is what lets a test tell a skipped round
// trip from a skipped query. `withPostgres` only runs the callback, against the supplied db or
// this fake when the caller lends none; the real borrow-or-own lifetime lives in postgres.ts and
// is pinned by postgres.test.ts.
export function makeFakePostgresModule() {
	const executeTakeFirst = vi.fn()
	const db: any = {
		selectFrom: () => db,
		select: () => db,
		where: () => db,
		executeTakeFirst,
		destroy: vi.fn(),
	}
	const withPostgres = vi.fn(
		async (_env: unknown, _name: string, suppliedDb: any, fn: (db: any) => Promise<unknown>) =>
			fn(suppliedDb ?? db)
	)
	return { db, executeTakeFirst, withPostgres }
}

export type FakePostgresModule = ReturnType<typeof makeFakePostgresModule>

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
