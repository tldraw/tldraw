export function getR2KeyForRoom({ slug, isApp }: { slug: string; isApp: boolean }) {
	return `${isApp ? 'app_rooms' : 'public_rooms'}/${slug}`
}

export function getR2KeyForSnapshot({
	parentSlug,
	snapshotSlug,
	isApp,
}: {
	parentSlug: string | undefined | null
	snapshotSlug: string
	isApp: boolean
}) {
	// We might not have a parent slug. This happens when creating a snapshot from a local room.
	const slug = parentSlug ? `${parentSlug}/${snapshotSlug}` : snapshotSlug
	return getR2KeyForRoom({ slug, isApp })
}

async function listAllObjectKeys(bucket: R2Bucket, prefix: string): Promise<string[]> {
	const keys: string[] = []
	let cursor: string | undefined

	do {
		const result = await bucket.list({ prefix, cursor })
		keys.push(...result.objects.map((o) => o.key))
		cursor = result.truncated ? result.cursor : undefined
	} while (cursor)

	return keys
}

// R2 deletes at most 1000 keys per call, so deleting everything a `list` returned in one go
// throws once a board has more history objects than that (one per persist) — and the cleanup
// that called it is left half-done.
const MAX_R2_DELETE_KEYS = 1000

export async function deleteAllObjectsWithPrefix(bucket: R2Bucket, prefix: string) {
	const keys = await listAllObjectKeys(bucket, prefix)
	for (let i = 0; i < keys.length; i += MAX_R2_DELETE_KEYS) {
		await bucket.delete(keys.slice(i, i + MAX_R2_DELETE_KEYS))
	}
}
