import type { Repo } from '@pierre/storage'
import type { RoomSnapshot } from '@tldraw/sync-core'
import type { PierreMeta } from '../TLDrawDurableObject'
import { readTarStream } from './tarStreamReader'

/** Actual format from Pierre: listFiles and getArchiveStream use repo-root paths with no prefix. */
function isMetaJson(name: string) {
	return name === 'meta.json'
}

/** Record files are exactly records/<id>.json; tar also includes a "records/" directory entry (excluded here). */
function isRecordFile(name: string) {
	return /^records\/[^/]+\.json$/.test(name)
}

type DocEntry = RoomSnapshot['documents'][number]

export interface PierreArchiveHandlers {
	onMeta(meta: PierreMeta): void | Promise<void>
	onDocument(doc: DocEntry): void | Promise<void>
}

/**
 * Iterate over a Pierre repo archive at a given ref. Calls onMeta when meta.json is read,
 * onDocument for each record file, in tar order. Throws if the archive is empty or has no meta.json.
 * Uses a custom tar stream reader (no modern-tar) to avoid sub-stream backpressure deadlocks in Workers.
 */
export async function iteratePierreArchive(
	repo: Repo,
	ref: string,
	handlers: PierreArchiveHandlers
): Promise<void> {
	const resp = await repo.getArchiveStream({ ref })
	if (!resp.body) {
		throw new Error(`Empty archive body from Pierre at ref ${ref}`)
	}
	const decompressed = resp.body.pipeThrough(new DecompressionStream('gzip'))

	let metaSeen = false
	for await (const entry of readTarStream(decompressed)) {
		const name = entry.name
		if (isMetaJson(name)) {
			const text = new TextDecoder().decode(entry.body)
			const meta = JSON.parse(text) as PierreMeta
			metaSeen = true
			await handlers.onMeta(meta)
		} else if (isRecordFile(name)) {
			const text = new TextDecoder().decode(entry.body)
			const state = JSON.parse(text) as DocEntry['state']
			await handlers.onDocument({ state, lastChangedClock: 0 })
		}
		// Directory and other entries: body is already empty, nothing to skip
	}

	if (!metaSeen) {
		throw new Error(`No meta.json found in Pierre archive at ref ${ref}`)
	}
}

/**
 * Stream a RoomSnapshot as JSON from a Pierre repo at a given ref.
 * Does not hold the full documents array in memory; streams each document as it is read from the tar.
 * Use this for large files to avoid OOM.
 */
export function streamPierreSnapshotAsJson(repo: Repo, ref: string): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()
	return new ReadableStream<Uint8Array>({
		async start(controller) {
			let meta: PierreMeta | null = null
			const documentBuffer: DocEntry[] = []
			let headerSent = false
			let isFirstDoc = true

			const sendHeader = (m: PierreMeta) => {
				if (headerSent) return
				headerSent = true
				controller.enqueue(
					encoder.encode(
						`{"documentClock":${m.documentClock},"schema":${JSON.stringify(m.schema ?? null)},"documents":[`
					)
				)
			}

			const flushDoc = (doc: DocEntry) => {
				const chunk = isFirstDoc ? JSON.stringify(doc) : ',' + JSON.stringify(doc)
				isFirstDoc = false
				controller.enqueue(encoder.encode(chunk))
			}

			try {
				await iteratePierreArchive(repo, ref, {
					onMeta(m) {
						meta = m
						sendHeader(m)
						for (const doc of documentBuffer) flushDoc(doc)
						documentBuffer.length = 0
					},
					onDocument(doc) {
						if (meta) {
							sendHeader(meta)
							flushDoc(doc)
						} else {
							documentBuffer.push(doc)
						}
					},
				})
				if (meta) {
					sendHeader(meta)
					for (const doc of documentBuffer) flushDoc(doc)
				}
				controller.enqueue(encoder.encode(']}'))
				controller.close()
			} catch (err) {
				controller.error(err)
			}
		},
	})
}

/**
 * Reconstruct a RoomSnapshot from a Pierre repo at a given ref.
 * Streams the tar archive — only the parsed JSON values are held in memory.
 * For large files, use streamPierreSnapshotAsJson() and stream the response instead to avoid OOM.
 */
export async function reconstructSnapshotFromPierre(
	repo: Repo,
	ref: string
): Promise<RoomSnapshot> {
	let meta: PierreMeta | null = null
	const documents: RoomSnapshot['documents'] = []

	await iteratePierreArchive(repo, ref, {
		onMeta(m) {
			meta = m
		},
		onDocument(doc) {
			documents.push(doc)
		},
	})

	return {
		documentClock: meta!.documentClock,
		schema: meta!.schema,
		documents,
	}
}
