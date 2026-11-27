/** What a session may change in a file's room. The SDK's six, plus our own `comment`. */
export const FILE_CAPABILITIES = [
	'create-shape',
	'edit-shape',
	'delete-shape',
	'create-page',
	'edit-page',
	'delete-page',
	'comment',
] as const
export type FileCapability = (typeof FILE_CAPABILITIES)[number]

/** A session's tier in a file's room, from `getFileRoomAccess`. */
export type FileRoomAccess = 'read' | 'write'

// Every tier listed; otherwise a new tier silently gets write's capabilities.
const ACCESS: Record<FileRoomAccess, readonly FileCapability[]> = {
	read: [],
	write: FILE_CAPABILITIES,
}

export function getFileCapabilities(access: FileRoomAccess): readonly FileCapability[] {
	return ACCESS[access]
}
