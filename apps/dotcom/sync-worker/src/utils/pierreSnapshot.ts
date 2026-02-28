import type { Repo } from '@pierre/storage'
import { RoomSnapshot } from '@tldraw/sync-core'
import { createTarDecoder } from 'modern-tar'
import type { PierreMeta } from '../TLDrawDurableObject'

/** Actual format from Pierre: listFiles and getArchiveStream use repo-root paths with no prefix. */
function isMetaJson(name: string) {
	return name === 'meta.json'
}

/** Record files are exactly records/<id>.json; tar also includes a "records/" directory entry (excluded here). */
function isRecordFile(name: string) {
	return /^records\/[^/]+\.json$/.test(name)
}

/**
 * Reconstruct a RoomSnapshot from a Pierre repo at a given ref.
 * Streams the tar archive — only the parsed JSON values are held in memory.
 */
export async function reconstructSnapshotFromPierre(
	repo: Repo,
	ref: string
): Promise<RoomSnapshot> {
	const resp = await repo.getArchiveStream({ ref })
	if (!resp.body) {
		throw new Error(`Empty archive body from Pierre at ref ${ref}`)
	}
	const entries = resp.body
		.pipeThrough(new DecompressionStream('gzip'))
		.pipeThrough(createTarDecoder())

	let meta: PierreMeta | null = null
	const documents: RoomSnapshot['documents'] = []

	const reader = entries.getReader()
	try {
		while (true) {
			const { done, value: entry } = await reader.read()
			if (done) break
			const name = entry.header.name
			if (isMetaJson(name)) {
				meta = JSON.parse(await new Response(entry.body).text()) as PierreMeta
			} else if (isRecordFile(name)) {
				const state = JSON.parse(
					await new Response(entry.body).text()
				) as RoomSnapshot['documents'][number]['state']
				documents.push({ state, lastChangedClock: 0 })
			} else {
				await entry.body.cancel()
			}
		}
	} finally {
		reader.releaseLock()
	}

	if (!meta) {
		throw new Error(`No meta.json found in Pierre archive at ref ${ref}`)
	}

	return {
		documentClock: meta.documentClock,
		schema: meta.schema,
		documents,
	}
}
