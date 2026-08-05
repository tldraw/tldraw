import { TlaFile } from '@tldraw/dotcom-shared'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { getRoomDurableObject } from './durableObjects'

// Moved from TLPostgresReplicator. Errors propagate so the outbox consumer can retry.
export async function publishSnapshot(env: Environment, file: TlaFile) {
	// make sure the room's snapshot is up to date
	await getRoomDurableObject(env, file.id).awaitPersist()
	// and that it exists
	const snapshot = await env.ROOMS.get(getR2KeyForRoom({ slug: file.id, isApp: true }))

	if (!snapshot) {
		throw new Error(`Snapshot not found for file ${file.id}`)
	}
	const blob = await snapshot.blob()

	// Create a new slug for the published room
	await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, file.id)

	// Bang the snapshot into the database
	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true }),
		blob
	)
	const currentTime = new Date().toISOString()
	await env.ROOM_SNAPSHOTS.put(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}|${currentTime}`, isApp: true }),
		blob
	)
}

export async function unpublishSnapshot(env: Environment, file: TlaFile) {
	await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)
	await env.ROOM_SNAPSHOTS.delete(
		getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true })
	)
}
