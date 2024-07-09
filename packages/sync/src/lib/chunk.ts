// quarter of a megabyte, max possible utf-8 string size

// cloudflare workers only accept messages of max 1mb
const MAX_CLIENT_SENT_MESSAGE_SIZE_BYTES = 1024 * 1024
// utf-8 is max 4 bytes per char
const MAX_BYTES_PER_CHAR = 4

// in the (admittedly impossible) worst case, the max size is 1/4 of a megabyte
const MAX_SAFE_MESSAGE_SIZE = MAX_CLIENT_SENT_MESSAGE_SIZE_BYTES / MAX_BYTES_PER_CHAR

export function chunk(msg: string, maxSafeMessageSize = MAX_SAFE_MESSAGE_SIZE) {
	if (msg.length < maxSafeMessageSize) {
		return [msg]
	} else {
		const chunks = []
		let chunkNumber = 0
		let offset = msg.length
		while (offset > 0) {
			const prefix = `${chunkNumber}_`
			const chunkSize = Math.max(Math.min(maxSafeMessageSize - prefix.length, offset), 1)
			chunks.unshift(prefix + msg.slice(offset - chunkSize, offset))
			offset -= chunkSize
			chunkNumber++
		}
		return chunks
	}
}

const chunkRe = /^(\d+)_(.*)$/

export class JsonChunkAssembler {
	state:
		| 'idle'
		| {
				chunksReceived: string[]
				totalChunks: number
		  } = 'idle'

	handleMessage(msg: string): { data?: object; error?: Error } | null {
		if (msg.startsWith('{')) {
			const error = this.state === 'idle' ? undefined : new Error('Unexpected non-chunk message')
			this.state = 'idle'
			return { data: JSON.parse(msg), error }
		} else {
			const match = chunkRe.exec(msg)!
			if (!match) {
				this.state = 'idle'
				return { error: new Error('Invalid chunk: ' + JSON.stringify(msg.slice(0, 20) + '...')) }
			}
			const numChunksRemaining = Number(match[1])
			const data = match[2]

			if (this.state === 'idle') {
				this.state = {
					chunksReceived: [data],
					totalChunks: numChunksRemaining + 1,
				}
			} else {
				this.state.chunksReceived.push(data)
				if (numChunksRemaining !== this.state.totalChunks - this.state.chunksReceived.length) {
					this.state = 'idle'
					return { error: new Error(`Chunks received in wrong order`) }
				}
			}
			if (this.state.chunksReceived.length === this.state.totalChunks) {
				try {
					const data = JSON.parse(this.state.chunksReceived.join(''))
					return { data }
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
