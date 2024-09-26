/* eslint-disable local/no-export-star */
export { default as getLicenseKey } from './license'
export {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	RoomOpenModeToPath,
	SNAPSHOT_PREFIX,
	type RoomOpenMode,
} from './routes'
export type {
	CreateRoomRequestBody,
	CreateSnapshotRequestBody,
	CreateSnapshotResponseBody,
	GetReadonlySlugResponseBody,
	Snapshot,
} from './types'

export * from './tla-schema/TldrawAppFile'
export * from './tla-schema/TldrawAppFileEdit'
export * from './tla-schema/TldrawAppFileVisit'
export * from './tla-schema/TldrawAppSessionState'
export * from './tla-schema/TldrawAppUser'
export * from './tla-schema/tldrawAppSchema'
