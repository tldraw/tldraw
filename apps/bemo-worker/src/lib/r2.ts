export function getR2KeyForRoom(persistenceKey: string) {
	return `rooms/${persistenceKey}`
}

export function getR2KeyForAsset(persistenceKey: string) {
	return `assets/${persistenceKey}`
}
