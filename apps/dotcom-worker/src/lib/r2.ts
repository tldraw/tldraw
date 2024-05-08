export function getR2KeyForRoom(persistenceKey: string) {
	return `public_rooms/${persistenceKey}`
}

export function getR2KeyForSnapshot(parentSlug: string | undefined | null, snapshotSlug: string) {
	// We might not have a parent slug. This happens when creating a snapshot from a local room.
	const persistenceKey = parentSlug ? `${parentSlug}/${snapshotSlug}` : snapshotSlug
	return getR2KeyForRoom(persistenceKey)
}
