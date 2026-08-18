import { TlaFile } from '@tldraw/dotcom-shared'
import { getR2KeyForRoom, listAllObjectKeys } from '../r2'
import { deleteOgImage, enqueuePublishThumbnailRender } from '../routes/tla/ogImageQueue'
import { Environment } from '../types'
import { getRoomDurableObject } from './durableObjects'

// Errors propagate so the outbox consumer can retry.
export async function publishSnapshot(
	env: Environment,
	file: TlaFile,
	reportProblem: (error: unknown) => void
) {
	if (!file.publishedSlug) return
	// Flush the room's in-memory state to R2 first so the published copy is current.
	await getRoomDurableObject(env, file.id).awaitPersist()
	const snapshot = await env.ROOMS.get(getR2KeyForRoom({ slug: file.id, isApp: true }))

	if (!snapshot) {
		throw new Error(`Snapshot not found for file ${file.id}`)
	}
	const blob = await snapshot.blob()

	await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, file.id)

	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true }),
		blob
	)
	const currentTime = new Date().toISOString()
	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}|${currentTime}`, isApp: true }),
		blob
	)
	// The published snapshot is now the content an unfurl would show, so render its OG image
	// straight away rather than leaving the first crawler to find a cold cache. Reports failures
	// through `reportProblem` instead of throwing: the publish itself succeeded, and getOgImage
	// repairs a missing image on the next fetch.
	await enqueuePublishThumbnailRender(env, file.publishedSlug, reportProblem)
}

export async function unpublishSnapshot(env: Environment, file: TlaFile) {
	// Partially-created rows can lack a slug; nothing published to remove.
	if (!file.publishedSlug) return
	await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)
	// The current snapshot plus every `|timestamp` history entry written by republishes.
	const publishedKeys = await listAllObjectKeys(
		env.ROOM_SNAPSHOTS,
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true })
	)
	if (publishedKeys.length > 0) {
		await env.ROOM_SNAPSHOTS.delete(publishedKeys)
	}
	// The published thumbnail goes with the published snapshot it depicts. Scoped to
	// `kind: 'published'`, so the board's own file-keyed image is untouched. See deleteOgImage.
	await deleteOgImage(env, { kind: 'published', slug: file.publishedSlug })
}
