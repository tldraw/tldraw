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

/**
 * Every key under `prefix`, or the first `limit` of them. The limit is passed to R2 too, so a
 * capped listing is a single page rather than a full walk sliced afterwards.
 */
export async function listAllObjectKeys(
	bucket: R2Bucket,
	prefix: string,
	limit?: number
): Promise<string[]> {
	const keys: string[] = []
	let cursor: string | undefined

	do {
		const result = await bucket.list(
			limit === undefined ? { prefix, cursor } : { prefix, cursor, limit }
		)
		keys.push(...result.objects.map((o) => o.key))
		if (limit !== undefined && keys.length >= limit) return keys.slice(0, limit)
		cursor = result.truncated ? result.cursor : undefined
	} while (cursor)

	return keys
}
