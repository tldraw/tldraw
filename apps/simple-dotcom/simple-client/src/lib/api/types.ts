// API Types and Interfaces
// Shared type definitions for API requests and responses

export type WorkspaceRole = 'owner' | 'member'
export type SharingMode = 'private' | 'public_read_only' | 'public_editable'

// ============================================================================
// Common Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
	success: boolean
	data?: T
	error?: ApiError
}

export interface ApiError {
	code: string
	message: string
	details?: Record<string, unknown>
}

export interface PaginationParams {
	page?: number
	limit?: number
}

export interface PaginatedResponse<T> {
	data: T[]
	pagination: {
		page: number
		limit: number
		total: number
		totalPages: number
	}
}

// ============================================================================
// User & Profile Types
// ============================================================================

export interface User {
	id: string
	email: string
	display_name: string | null
	name: string | null
	created_at: string
	updated_at: string
}

export interface UpdateProfileRequest {
	display_name?: string
	name?: string
}

// ============================================================================
// Workspace Types
// ============================================================================

export interface Workspace {
	id: string
	owner_id: string
	name: string
	is_private: boolean
	is_deleted: boolean
	deleted_at: string | null
	created_at: string
	updated_at: string
}

export interface CreateWorkspaceRequest {
	name: string
}

export interface UpdateWorkspaceRequest {
	name?: string
}

export interface TransferOwnershipRequest {
	new_owner_id: string
}

// ============================================================================
// Workspace Member Types
// ============================================================================

export interface WorkspaceMember {
	id: string
	workspace_id: string
	user_id: string
	workspace_role: WorkspaceRole
	joined_at: string
	user: {
		id: string
		email: string
		display_name: string | null
		name: string | null
	}
}

// ============================================================================
// Invitation Types
// ============================================================================

export interface InvitationLink {
	id: string
	workspace_id: string
	token: string
	enabled: boolean
	created_by: string
	created_at: string
	regenerated_at: string | null
}

export interface UpdateInvitationRequest {
	enabled: boolean
}

export interface JoinWorkspaceRequest {
	token: string
}

// ============================================================================
// Document Types
// ============================================================================

export interface Document {
	id: string
	workspace_id: string
	folder_id: string | null
	name: string
	created_by: string
	sharing_mode: SharingMode
	is_archived: boolean
	archived_at: string | null
	r2_key: string | null
	created_at: string
	updated_at: string
}

export interface CreateDocumentRequest {
	name: string
	folder_id?: string | null
}

export interface UpdateDocumentRequest {
	name?: string
	folder_id?: string | null
	is_archived?: boolean
}

export interface DuplicateDocumentRequest {
	name?: string
	folder_id?: string | null
}

export interface UpdateSharingRequest {
	sharing_mode: SharingMode
}

export interface MoveDocumentRequest {
	target_workspace_id: string
	target_folder_id?: string | null
}

// ============================================================================
// Folder Types
// ============================================================================

export interface Folder {
	id: string
	workspace_id: string
	parent_folder_id: string | null
	name: string
	created_by: string
	created_at: string
	updated_at: string
}

export interface CreateFolderRequest {
	name: string
	parent_folder_id?: string | null
}

export interface UpdateFolderRequest {
	name?: string
	parent_folder_id?: string | null
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchParams {
	query: string
	workspace_id?: string
	limit?: number
}

export interface SearchResult {
	document: Document
	workspace: {
		id: string
		name: string
	}
}

// ============================================================================
// Presence Types
// ============================================================================

export interface PresenceSession {
	session_id: string
	document_id: string
	user_id: string | null
	display_name: string | null
	cursor_position: { x: number; y: number } | null
	last_seen_at: string
}

export interface UpdatePresenceRequest {
	cursor_position?: { x: number; y: number } | null
}

// ============================================================================
// Access Log Types
// ============================================================================

export interface RecentDocument {
	document: Document
	last_accessed_at: string
	workspace: {
		id: string
		name: string
	}
}
