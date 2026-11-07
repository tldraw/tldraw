// quarter of a megabyte, max possible utf-8 string size

// cloudflare workers only accept messages of max 1mb
const MAX_CLIENT_SENT_MESSAGE_SIZE_BYTES = 1024 * 1024
// utf-8 is max 4 bytes per char
const MAX_BYTES_PER_CHAR = 4

// in the (admittedly impossible) worst case, the max size is 1/4 of a megabyte
const MAX_SAFE_MESSAGE_SIZE = MAX_CLIENT_SENT_MESSAGE_SIZE_BYTES / MAX_BYTES_PER_CHAR

// JsonChunkAssembler holds every chunk of a message until the last one arrives, and the sender
// decides how many that is — the count is just a prefix on the first chunk. Nothing in the
// protocol obliges a sender to ever send the last chunk, so without a ceiling a single connection
// can make the receiver hold an arbitrarily large buffer for as long as the socket stays open.
//
// The cap counts UTF-16 code units, which is what a JS string costs in memory: 16M of them is the
// 32MB of retained string data a room can afford to hold per session and stay inside a Durable
// Object's 128MB instance limit with room for the document itself. It is far above anything
// chunk() produces for a real document push. The character cap is the real bound; the chunk-count
// cap only rejects an absurd declared count on arrival instead of waiting for the characters to
// accumulate, and is loose enough not to constrain a sender that chunks more finely than the
// default.
export const MAX_ASSEMBLED_MESSAGE_CHARS = 16 * 1024 * 1024
export const MAX_CHUNK_COUNT = 100_000

/**
 * Thrown when a message would exceed MAX_ASSEMBLED_MESSAGE_CHARS, on either side of the wire.
 * Distinct from the other assembly errors because it is fatal: retrying sends the same
 * oversized message, so the session is rejected rather than reset.
 *
 * @internal
 */
export class MessageTooLargeError extends Error {
	constructor(chars: number) {
		super(`Message too large: ${chars} characters, max ${MAX_ASSEMBLED_MESSAGE_CHARS}`)
		this.name = 'MessageTooLargeError'
	}
}

/**
 * Splits a string into smaller chunks suitable for transmission over WebSockets.
 * This function ensures messages don't exceed size limits imposed by platforms like Cloudflare Workers (1MB max).
 * Each chunk is prefixed with a number indicating how many more chunks follow.
 *
 * @param msg - The string to split into chunks
 * @param maxSafeMessageSize - Maximum safe size for each chunk in characters. Defaults to quarter megabyte to account for UTF-8 encoding
 * @returns Array of chunked strings, each prefixed with "\{number\}_" where number indicates remaining chunks
 *
 * @example
 * ```ts
 * // Small message - returns as single chunk
 * chunk('hello world') // ['hello world']
 *
 * // Large message - splits into multiple chunks
 * chunk('very long message...', 10)
 * // ['2_very long', '1_ message', '0_...']
 * ```
 *
 * @internal
 */
export function chunk(msg: string, maxSafeMessageSize = MAX_SAFE_MESSAGE_SIZE) {
	if (msg.length < maxSafeMessageSize) {
		return [msg]
	} else {
		const chunks = []
		let chunkNumber = 0
		let offset = msg.length
		while (offset > 0) {
			const prefix = `${chunkNumber}_`
			let chunkSize = Math.max(Math.min(maxSafeMessageSize - prefix.length, offset), 1)
			// Never split a surrogate pair across chunks: WebSocket.send converts each chunk to a
			// USVString, turning a lone surrogate into U+FFFD, so the reassembled JSON silently
			// carries corrupted text. Shrink by one so the pair moves whole into the preceding
			// chunk; a single-character chunk grows by one instead (one over the CH3 bound, see CH9).
			if (
				chunkSize < offset &&
				isLowSurrogate(msg.charCodeAt(offset - chunkSize)) &&
				isHighSurrogate(msg.charCodeAt(offset - chunkSize - 1))
			) {
				chunkSize += chunkSize > 1 ? -1 : 1
			}
			chunks.unshift(prefix + msg.slice(offset - chunkSize, offset))
			offset -= chunkSize
			chunkNumber++
		}
		return chunks
	}
}

function isHighSurrogate(code: number) {
	return code >= 0xd800 && code <= 0xdbff
}

function isLowSurrogate(code: number) {
	return code >= 0xdc00 && code <= 0xdfff
}

// The 's' flag (dotAll) makes '.' match any character including line terminators
// like U+2028 and U+2029, which are commonly introduced via copy/paste from Word
const chunkRe = /^(\d+)_(.*)$/s

/**
 * Assembles chunked JSON messages back into complete objects.
 * Handles both regular JSON messages and chunked messages created by the chunk() function.
 * Maintains internal state to track partially received chunked messages.
 *
 * @example
 * ```ts
 * const assembler = new JsonChunkAssembler()
 *
 * // Handle regular JSON message
 * const result1 = assembler.handleMessage('{"hello": "world"}')
 * // Returns: { data: { hello: "world" }, stringified: '{"hello": "world"}' }
 *
 * // Handle chunked message
 * assembler.handleMessage('1_hello') // Returns: null (partial)
 * const result2 = assembler.handleMessage('0_ world')
 * // Returns: { data: "hello world", stringified: "hello world" }
 * ```
 *
 * @public
 */
export class JsonChunkAssembler {
	/**
	 * Current assembly state - either 'idle' or tracking chunks being received
	 */
	state:
		| 'idle'
		| {
				chunksReceived: string[]
				totalChunks: number
				charsReceived: number
		  } = 'idle'

	/**
	 * Processes a single message, which can be either a complete JSON object or a chunk.
	 * For complete JSON objects (starting with '\{'), parses immediately.
	 * For chunks (prefixed with "\{number\}_"), accumulates until all chunks received.
	 *
	 * @param msg - The message to process, either JSON or chunk format
	 * @returns Result object with data/stringified on success, error object on failure, or null for incomplete chunks
	 * 	- `\{ data: object, stringified: string \}` - Successfully parsed complete message
	 * 	- `\{ error: Error \}` - Parse error, invalid chunk sequence, or a message exceeding
	 * 	  MAX_ASSEMBLED_MESSAGE_CHARS / MAX_CHUNK_COUNT
	 * 	- `null` - Chunk received but more chunks expected
	 *
	 * @example
	 * ```ts
	 * const assembler = new JsonChunkAssembler()
	 *
	 * // Complete JSON message
	 * const result = assembler.handleMessage('{"key": "value"}')
	 * if (result && 'data' in result) {
	 *   console.log(result.data) // { key: "value" }
	 * }
	 *
	 * // Chunked message sequence
	 * assembler.handleMessage('2_hel') // null - more chunks expected
	 * assembler.handleMessage('1_lo ') // null - more chunks expected
	 * assembler.handleMessage('0_wor') // { data: "hello wor", stringified: "hello wor" }
	 * ```
	 */
	handleMessage(msg: string): { error: Error } | { stringified: string; data: object } | null {
		if (msg.startsWith('{')) {
			const error = this.state === 'idle' ? undefined : new Error('Unexpected non-chunk message')
			this.state = 'idle'
			return error ? { error } : { data: JSON.parse(msg), stringified: msg }
		} else {
			const match = chunkRe.exec(msg)!
			if (!match) {
				this.state = 'idle'
				return { error: new Error('Invalid chunk: ' + JSON.stringify(msg.slice(0, 20) + '...')) }
			}
			const numChunksRemaining = Number(match[1])
			const data = match[2]

			if (this.state === 'idle') {
				const totalChunks = numChunksRemaining + 1
				if (totalChunks > MAX_CHUNK_COUNT) {
					// Nothing has been buffered yet, so the state is already idle.
					return { error: new Error(`Too many chunks: ${totalChunks}`) }
				}
				this.state = {
					chunksReceived: [data],
					totalChunks,
					charsReceived: data.length,
				}
			} else {
				this.state.chunksReceived.push(data)
				this.state.charsReceived += data.length
				if (numChunksRemaining !== this.state.totalChunks - this.state.chunksReceived.length) {
					this.state = 'idle'
					return { error: new Error(`Chunks received in wrong order`) }
				}
			}
			if (this.state.charsReceived > MAX_ASSEMBLED_MESSAGE_CHARS) {
				// Drop what was buffered rather than keeping it until the socket closes.
				const charsReceived = this.state.charsReceived
				this.state = 'idle'
				return { error: new MessageTooLargeError(charsReceived) }
			}
			if (this.state.chunksReceived.length === this.state.totalChunks) {
				try {
					const stringified = this.state.chunksReceived.join('')
					const data = JSON.parse(stringified)
					return { data, stringified }
				} catch (e) {
					return { error: e as Error }
				} finally {
					this.state = 'idle'
				}
			}
			return null
		}
	}
}
