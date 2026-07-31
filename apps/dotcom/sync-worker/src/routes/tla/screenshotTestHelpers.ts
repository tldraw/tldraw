import { vi } from 'vitest'
import { Environment } from '../../types'

// Shared fakes for the Browser Run thumbnail / OG image tests (thumbnailRender,
// sharedBoardScreenshotMcp, ogImageQueue, getOgImage). These were copy-pasted across those files;
// keep them here so the R2/browser/queue fakes, snapshot builder, and token helpers stay in one
// place.

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

// In-memory stand-in for the THUMBNAILS R2 bucket. Exposes `store` so tests can inspect or seed
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

// Stand-in for the TLDR_DOC namespace. The screenshot surfaces never `.get()` a room — they only
// derive its durable object id for telemetry — so a readable deterministic id is enough, and keeps
// the subject a test asserts on legible.
export function makeFakeRoomNamespace() {
	return { idFromName: (name: string) => ({ toString: () => `do:${name}` }) }
}

/** The durable object id {@link makeFakeRoomNamespace} derives for a file, as telemetry sees it. */
export function fakeRoomSubject(fileId: string) {
	return `do:/r/${fileId}`
}

export function makeScreenshotTestEnv(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		BROWSER: makeBrowserBinding(),
		MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com',
		MCP_SCREENSHOT_TOKEN_SECRET: 'test-secret',
		MEASURE: { writeDataPoint: vi.fn() },
		QUEUE: makeFakeQueue(),
		TLDR_DOC: makeFakeRoomNamespace(),
		...overrides,
	} as unknown as Environment
}

/** The `index1` of every datapoint written, in order; `undefined` where a row had no subject. */
export function subjectsOf(env: Environment): Array<string | undefined> {
	return (env.MEASURE as any).writeDataPoint.mock.calls.map((call: any[]) => call[0].indexes?.[0])
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

// quickAction is called as quickAction('screenshot', body); the render URL rides in body (arg 1).
export function tokenFromScreenshot(env: Environment): string {
	const body = screenshotOf(env).mock.calls[0]![1] as { url: string }
	return new URL(body.url).searchParams.get('token')!
}
