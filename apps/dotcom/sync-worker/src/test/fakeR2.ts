interface FakeObject {
	body: Uint8Array
	customMetadata: Record<string, string>
}

/**
 * Enough of R2 for the version chain read paths: prefix listing in key order with `include`,
 * `startAfter`, `get`, `put`, `head` and `delete`. Bodies are held as bytes because chain objects
 * are gzipped. Deliberately not a general R2 mock.
 */
export function createFakeR2(): R2Bucket {
	const objects = new Map<string, FakeObject>()

	const toR2Object = (key: string, object: FakeObject, includeMetadata = true) => ({
		key,
		customMetadata: includeMetadata ? object.customMetadata : undefined,
		size: object.body.byteLength,
		// A real ReadableStream, so code that pipes `body` through a transform works unchanged.
		body: new Blob([object.body as unknown as BlobPart]).stream(),
		text: async () => new TextDecoder().decode(object.body),
		json: async () => JSON.parse(new TextDecoder().decode(object.body)),
		arrayBuffer: async () =>
			object.body.buffer.slice(
				object.body.byteOffset,
				object.body.byteOffset + object.body.byteLength
			),
	})

	return {
		async put(key: string, body: any, options?: any) {
			objects.set(key, {
				body: typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body),
				customMetadata: options?.customMetadata ?? {},
			})
			return toR2Object(key, objects.get(key)!) as any
		},
		async get(key: string) {
			const object = objects.get(key)
			return object ? (toR2Object(key, object) as any) : null
		},
		async head(key: string) {
			const object = objects.get(key)
			return object ? (toR2Object(key, object) as any) : null
		},
		async delete(keys: string | string[]) {
			for (const key of Array.isArray(keys) ? keys : [keys]) objects.delete(key)
		},
		async list(options?: any) {
			const matching = [...objects.keys()]
				.filter((key) => (options?.prefix ? key.startsWith(options.prefix) : true))
				.filter((key) => (options?.startAfter ? key > options.startAfter : true))
				// The cursor is the previous page's last key, so paging code driven by `truncated`
				// actually advances instead of looping on page one forever.
				.filter((key) => (options?.cursor ? key > options.cursor : true))
				.sort()
			const limit = options?.limit ?? 1000
			const page = matching.slice(0, limit)
			const includeMetadata = options?.include?.includes('customMetadata') ?? false
			return {
				objects: page.map((key) => toR2Object(key, objects.get(key)!, includeMetadata)),
				truncated: matching.length > page.length,
				cursor: page[page.length - 1],
			} as any
		},
	} as unknown as R2Bucket
}
