/**
 * Minimal USTAR tar stream reader. Single reader, no sub-streams — reads header then
 * exactly N bytes for each file body to avoid backpressure/deadlock issues in Workers.
 *
 * Why we built this: We use Pierre archives (gzipped tar) for history snapshots. The
 * obvious approach was modern-tar: pipe the response through DecompressionStream and
 * createTarDecoder(), then read each entry.body (a ReadableStream). That works on
 * Node but in Cloudflare Workers it deadlocks: the transform only feeds entry.body
 * when it receives more input, and the pipe doesn't push more input while the
 * consumer is blocked on entry.body. So we never get the next chunk and the body
 * never completes. This reader avoids that by having a single consumer: we pull
 * from the stream ourselves, buffer as needed, and yield entry bodies as plain
 * Uint8Arrays. No nested ReadableStreams, no backpressure deadlock.
 */

const BLOCK_SIZE = 512
const NAME_OFFSET = 0
const NAME_SIZE = 100
const SIZE_OFFSET = 124
const SIZE_SIZE = 12
const TYPEFLAG_OFFSET = 156
const PREFIX_OFFSET = 345
const PREFIX_SIZE = 155

function parseOctal(view: Uint8Array, offset: number, size: number): number {
	let value = 0
	const end = Math.min(offset + size, view.length)
	for (let i = offset; i < end; i++) {
		const c = view[i]
		if (c === 0 || c === 0x20) break
		value = value * 8 + (c - 0x30)
	}
	return value
}

function parseNullTerminatedString(view: Uint8Array, offset: number, size: number): string {
	const end = Math.min(offset + size, view.length)
	let len = 0
	while (len < size && offset + len < end && view[offset + len] !== 0) {
		len++
	}
	return new TextDecoder().decode(view.subarray(offset, offset + len))
}

export interface TarEntry {
	name: string
	size: number
	typeflag: number
	/** For file entries, body is the raw bytes. No sub-stream. */
	body: Uint8Array
}

/**
 * Consume exactly `want` bytes from the stream (from buffer first, then reader).
 * Returns the bytes and updates buffer to hold any remainder.
 */
async function readExactly(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	buffer: Uint8Array[],
	bufferOffset: { bytes: number },
	want: number
): Promise<Uint8Array> {
	// Read more from stream until we have at least `want` bytes
	while (bufferOffset.bytes < want) {
		const { done, value } = await reader.read()
		if (done) throw new Error('Tar stream ended before expected bytes')
		if (value?.length) {
			buffer.push(value)
			bufferOffset.bytes += value.length
		}
	}
	// Take first `want` bytes from buffer
	const out = new Uint8Array(want)
	let taken = 0
	while (taken < want && buffer.length > 0) {
		const chunk = buffer[0]
		const need = want - taken
		const toTake = Math.min(chunk.length, need)
		out.set(chunk.subarray(0, toTake), taken)
		taken += toTake
		if (toTake === chunk.length) {
			buffer.shift()
			bufferOffset.bytes -= chunk.length
		} else {
			buffer[0] = chunk.subarray(toTake)
			bufferOffset.bytes -= toTake
		}
	}
	return out
}

/** Discard exactly `want` bytes from the stream. */
async function skipExactly(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	buffer: Uint8Array[],
	bufferOffset: { bytes: number },
	want: number
): Promise<void> {
	if (want <= 0) return
	// Consume from buffer first
	while (want > 0 && buffer.length > 0) {
		const chunk = buffer[0]
		const toConsume = Math.min(chunk.length, want)
		if (toConsume === chunk.length) {
			buffer.shift()
			bufferOffset.bytes -= chunk.length
		} else {
			buffer[0] = chunk.subarray(toConsume)
			bufferOffset.bytes -= toConsume
		}
		want -= toConsume
	}
	if (want > 0) {
		await readExactly(reader, buffer, bufferOffset, want)
	}
}

function isZeroBlock(block: Uint8Array): boolean {
	for (let i = 0; i < block.length; i++) if (block[i] !== 0) return false
	return true
}

/**
 * Iterate over USTAR tar entries from a stream. Yields { name, size, typeflag, body }.
 * Body is the raw file bytes (no sub-stream). Directories and other bodyless entries have body length 0.
 */
export async function* readTarStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<TarEntry> {
	const reader = stream.getReader()
	const buffer: Uint8Array[] = []
	const bufferOffset = { bytes: 0 }

	try {
		while (true) {
			const header = await readExactly(reader, buffer, bufferOffset, BLOCK_SIZE)
			if (header.length < BLOCK_SIZE) break
			if (isZeroBlock(header)) break
			const name = parseNullTerminatedString(header, NAME_OFFSET, NAME_SIZE)
			const prefix = parseNullTerminatedString(header, PREFIX_OFFSET, PREFIX_SIZE)
			const fullName = prefix ? `${prefix}/${name}` : name
			const size = parseOctal(header, SIZE_OFFSET, SIZE_SIZE)
			const typeflag = header[TYPEFLAG_OFFSET] ?? 0
			// typeflag '0' = normal file, '5' = directory; others we skip body
			const hasBody = typeflag === 0x30 && size > 0 // '0'
			const body = hasBody
				? await readExactly(reader, buffer, bufferOffset, size)
				: new Uint8Array(0)
			if (hasBody && size > 0) {
				const padding = (BLOCK_SIZE - (size % BLOCK_SIZE)) % BLOCK_SIZE
				await skipExactly(reader, buffer, bufferOffset, padding)
			}
			yield { name: fullName, size, typeflag, body }
		}
	} finally {
		reader.releaseLock()
	}
}
