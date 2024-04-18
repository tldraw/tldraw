/** @public */
export enum RoomOpenMode {
	READ_ONLY = 'readonly',
	READ_ONLY_LEGACY = 'readonly-legacy',
	READ_WRITE = 'read-write',
}

/** @public */
export const RoomOpenModeToPath: Record<RoomOpenMode, string> = {
	[RoomOpenMode.READ_ONLY]: 'ro',
	[RoomOpenMode.READ_ONLY_LEGACY]: 'v',
	[RoomOpenMode.READ_WRITE]: 'r',
}
