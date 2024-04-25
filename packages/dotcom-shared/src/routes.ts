/** @public */
export const ROOM_OPEN_MODE = {
	READ_ONLY: 'readonly',
	READ_ONLY_LEGACY: 'readonly-legacy',
	READ_WRITE: 'read-write',
} as const
export type RoomOpenMode = (typeof ROOM_OPEN_MODE)[keyof typeof ROOM_OPEN_MODE]

/** @public */
export const RoomOpenModeToPath: Record<RoomOpenMode, string> = {
	[ROOM_OPEN_MODE.READ_ONLY]: 'ro',
	[ROOM_OPEN_MODE.READ_ONLY_LEGACY]: 'v',
	[ROOM_OPEN_MODE.READ_WRITE]: 'r',
}
