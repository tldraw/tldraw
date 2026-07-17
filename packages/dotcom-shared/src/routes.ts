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

/**
 * Query param that opts a request out of the social preview crawler routing. Some in-app browsers
 * used by real people carry a crawler token in their user-agent (WhatsApp, Pinterest), so they get
 * routed to the social preview stub; the stub redirects them back to the board with this param set,
 * and the Vercel crawler route ignores requests that carry it.
 *
 * The param must be set with a non-empty value (we use `no_preview=1`), never bare. Vercel's
 * `has`/`missing` matching treats a param with no expected value as present only when its actual
 * value is truthy (`!hasItem.value && value` in Next.js's matchHas, which mirrors the proxy), so a
 * bare `?no_preview` parses to an empty string and reads as absent — the `missing` condition would
 * still pass, the crawler route would match again, and the stub would redirect to itself forever.
 *
 * @public
 */
export const SOCIAL_PREVIEW_BYPASS_PARAM = 'no_preview'

/** @public */
export const RoomOpenModeToPath: Record<RoomOpenMode, string> = {
	[ROOM_OPEN_MODE.READ_ONLY]: READ_ONLY_PREFIX,
	[ROOM_OPEN_MODE.READ_ONLY_LEGACY]: READ_ONLY_LEGACY_PREFIX,
	[ROOM_OPEN_MODE.READ_WRITE]: ROOM_PREFIX,
}

/** @public */
export const APP_ASSET_UPLOAD_ENDPOINT = '/api/app/uploads/'
