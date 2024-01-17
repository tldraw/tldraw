const MAX_ROOM_ID_LENGTH = 128

export function isRoomIdTooLong(roomId: string) {
	return roomId.length > MAX_ROOM_ID_LENGTH
}

export function roomIdIsTooLong() {
	return new Response('Room ID too long', { status: 400 })
}
