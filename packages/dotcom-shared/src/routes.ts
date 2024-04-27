/** @public */
export const ROOM_OPEN_MODE = {
	READ_ONLY: 'readonly',
	READ_ONLY_LEGACY: 'readonly-legacy',
	READ_WRITE: 'read-write',
} as const
export type RoomOpenMode = (typeof ROOM_OPEN_MODE)[keyof typeof ROOM_OPEN_MODE]

/** @public */
export const READ_ONLY_PREFIX = 'ro'
/** @public */
export const READ_ONLY_LEGACY_PREFIX = 'v'
/** @public */
export const ROOM_PREFIX = 'r'
/** @public */
export const SNAPSHOT_PREFIX = 's'

/** @public */
export const RoomOpenModeToPath: Record<RoomOpenMode, string> = {
	[ROOM_OPEN_MODE.READ_ONLY]: READ_ONLY_PREFIX,
	[ROOM_OPEN_MODE.READ_ONLY_LEGACY]: READ_ONLY_LEGACY_PREFIX,
	[ROOM_OPEN_MODE.READ_WRITE]: ROOM_PREFIX,
}
