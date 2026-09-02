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

export async function listAllObjectKeys(bucket: R2Bucket, prefix: string): Promise<string[]> {
	const keys: string[] = []
	let cursor: string | undefined

	do {
		const result = await bucket.list({ prefix, cursor })
		keys.push(...result.objects.map((o) => o.key))
		cursor = result.truncated ? result.cursor : undefined
	} while (cursor)

	return keys
}
