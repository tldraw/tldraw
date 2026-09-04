const ENCODING_METADATA_KEY = 'bodyEncoding'

/** Gzipped JSON, plus the metadata that tells the read side it is gzipped. */
export async function encodeVersionBody(
	value: unknown
): Promise<{ body: Uint8Array; metadata: Record<string, string> }> {
	const json = new TextEncoder().encode(JSON.stringify(value))
	const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
	return {
		body: new Uint8Array(await new Response(stream).arrayBuffer()),
		metadata: { [ENCODING_METADATA_KEY]: 'gzip' },
	}
}

/**
 * The stamp is what decides, not a magic byte: legacy full copies and anything written before
 * compression landed are plain JSON, and both have to keep reading correctly forever.
 */
export function isGzippedVersionBody(object: R2Object): boolean {
	return object.customMetadata?.[ENCODING_METADATA_KEY] === 'gzip'
}

export async function decodeVersionBody(object: R2ObjectBody): Promise<unknown> {
	if (!isGzippedVersionBody(object)) {
		return await object.json()
	}
	const bytes = await object.arrayBuffer()
	const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
	return JSON.parse(await new Response(stream).text())
}
