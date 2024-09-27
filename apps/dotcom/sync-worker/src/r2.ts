export function getR2KeyForRoom(persistenceKey: string, isApp: boolean) {
	return `${isApp ? 'app_rooms' : 'public_rooms'}/${persistenceKey}`
}

export function getR2KeyForSnapshot(
	parentSlug: string | undefined | null,
	snapshotSlug: string,
	isApp: boolean
) {
	// We might not have a parent slug. This happens when creating a snapshot from a local room.
	const persistenceKey = parentSlug ? `${parentSlug}/${snapshotSlug}` : snapshotSlug
	return getR2KeyForRoom(persistenceKey, isApp)
}
