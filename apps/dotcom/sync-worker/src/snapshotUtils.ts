import { RoomSnapshot } from '@tldraw/sync-core'

function toJsonString(value: unknown): string {
	if (value === undefined) {
		return 'null'
	}
	return JSON.stringify(value)
}

export function* generateSnapshotChunks(snapshot: RoomSnapshot): Generator<Uint8Array> {
	const encoder = new TextEncoder()

	yield encoder.encode('{')

	const keys = Object.keys(snapshot) as Array<keyof RoomSnapshot>
	let isFirstKey = true

	for (const key of keys) {
		if (isFirstKey) {
			isFirstKey = false
		} else {
			yield encoder.encode(',')
		}

		yield encoder.encode(`"${key}":`)

		const value = snapshot[key]
		if (Array.isArray(value)) {
			yield encoder.encode('[')
			for (let i = 0; i < value.length; i++) {
				if (i > 0) {
					yield encoder.encode(',')
				}
				yield encoder.encode(toJsonString(value[i]))
			}
			yield encoder.encode(']')
		} else {
			yield encoder.encode(toJsonString(value))
		}
	}

	yield encoder.encode('}')
}
