/** @public */
export type RoomOpenMode = 'readonly' | 'readonly-legacy' | 'read-write'
/** @public */
export const RoomOpenModeToPath: Record<RoomOpenMode, string> = {
	readonly: 'ro',
	'readonly-legacy': 'v',
	'read-write': 'r',
}
