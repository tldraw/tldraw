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
export const FILE_PREFIX = 'f'
/** @public */
export const PUBLISH_PREFIX = 'p'
/** @public */
export const LOCAL_FILE_PREFIX = 'lf'

/** @public */
export const RoomOpenModeToPath: Record<RoomOpenMode, string> = {
	[ROOM_OPEN_MODE.READ_ONLY]: READ_ONLY_PREFIX,
	[ROOM_OPEN_MODE.READ_ONLY_LEGACY]: READ_ONLY_LEGACY_PREFIX,
	[ROOM_OPEN_MODE.READ_WRITE]: ROOM_PREFIX,
}

/** @public */
export const APP_ASSET_UPLOAD_ENDPOINT = '/api/app/uploads/'

/**
 * The client route that renders a board for Browser Run thumbnail capture. The sync worker builds
 * this URL with a signed render token; the page exchanges the token for snapshot data.
 *
 * @public
 */
export const THUMBNAIL_RENDER_PATH = '/__thumbnail-render'
