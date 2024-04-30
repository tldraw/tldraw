export function getR2KeyForRoom(persistenceKey: string) {
	return `public_rooms/${persistenceKey}`
}

export function getRoomIdFromR2Key(r2Key: string) {
	return r2Key.split('/')[1]
}
