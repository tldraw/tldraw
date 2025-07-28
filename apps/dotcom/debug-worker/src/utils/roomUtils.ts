export function getR2Key(isApp: boolean, roomId: string) {
	return `${isApp ? 'app_rooms' : 'public_rooms'}/${roomId}`
}
