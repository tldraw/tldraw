// Real-time Event Types
// Defines the structure and types for real-time events across the application

/**
 * Standard event format for all real-time updates
 */
export interface RealtimeEvent<T = unknown> {
	type: string
	payload: T
	timestamp: string
	actor_id: string
}

/**
 * Workspace-level events
 */
export type WorkspaceEventType =
	| 'workspace.updated'
	| 'workspace.archived'
	| 'workspace.restored'
	| 'member.added'
	| 'member.removed'
	| 'member.updated'
	| 'folder.created'
	| 'folder.updated'
	| 'folder.deleted'
	| 'document.created'
	| 'document.updated'
	| 'document.archived'
	| 'document.restored'
	| 'document.deleted'

/**
 * Channel naming conventions
 */
export const CHANNEL_PATTERNS = {
	workspace: (workspaceId: string) => `workspace:${workspaceId}`,
	document: (documentId: string) => `document:${documentId}`,
} as const

/**
 * Event payload types
 */
export interface WorkspaceUpdatePayload {
	workspaceId: string
	name?: string
	description?: string
	updatedAt: string
}

export interface MemberChangePayload {
	workspaceId: string
	userId: string
	role?: 'owner' | 'member'
	action: 'added' | 'removed' | 'updated'
}

export interface DocumentChangePayload {
	documentId: string
	workspaceId: string
	name?: string
	folderId?: string | null
	isArchived?: boolean
	action: 'created' | 'updated' | 'archived' | 'restored' | 'deleted'
}

export interface FolderChangePayload {
	folderId: string
	workspaceId: string
	name?: string
	parentId?: string | null
	action: 'created' | 'updated' | 'deleted'
}

/**
 * Type-safe event constructors
 */
export function createWorkspaceEvent(
	type: WorkspaceEventType,
	payload:
		| WorkspaceUpdatePayload
		| MemberChangePayload
		| DocumentChangePayload
		| FolderChangePayload,
	actorId: string
): RealtimeEvent {
	return {
		type,
		payload,
		timestamp: new Date().toISOString(),
		actor_id: actorId,
	}
}

/**
 * Type guards for event payloads
 */
export function isWorkspaceUpdatePayload(payload: unknown): payload is WorkspaceUpdatePayload {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'workspaceId' in payload &&
		typeof (payload as any).workspaceId === 'string'
	)
}

export function isMemberChangePayload(payload: unknown): payload is MemberChangePayload {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'workspaceId' in payload &&
		'userId' in payload &&
		'action' in payload
	)
}

export function isDocumentChangePayload(payload: unknown): payload is DocumentChangePayload {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'documentId' in payload &&
		'workspaceId' in payload &&
		'action' in payload
	)
}

export function isFolderChangePayload(payload: unknown): payload is FolderChangePayload {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'folderId' in payload &&
		'workspaceId' in payload &&
		'action' in payload
	)
}
