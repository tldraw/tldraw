// API Client
// Type-safe API client for frontend consumption

import {
	ApiResponse,
	Workspace,
	CreateWorkspaceRequest,
	UpdateWorkspaceRequest,
	TransferOwnershipRequest,
	WorkspaceMember,
	InvitationLink,
	UpdateInvitationRequest,
	Document,
	CreateDocumentRequest,
	UpdateDocumentRequest,
	UpdateSharingRequest,
	Folder,
	CreateFolderRequest,
	UpdateFolderRequest,
	SearchResult,
	PresenceSession,
	UpdatePresenceRequest,
} from './types'

class ApiClient {
	private baseUrl: string

	constructor(baseUrl: string = '/api') {
		this.baseUrl = baseUrl
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<ApiResponse<T>> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		})

		const data: ApiResponse<T> = await response.json()

		if (!response.ok || !data.success) {
			throw new Error(data.error?.message || 'API request failed')
		}

		return data
	}

	// ============================================================================
	// Workspaces
	// ============================================================================

	async getWorkspaces() {
		return this.request<Workspace[]>('/workspaces')
	}

	async getWorkspace(workspaceId: string) {
		return this.request<Workspace>(`/workspaces/${workspaceId}`)
	}

	async createWorkspace(data: CreateWorkspaceRequest) {
		return this.request<Workspace>('/workspaces', {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequest) {
		return this.request<Workspace>(`/workspaces/${workspaceId}`, {
			method: 'PATCH',
			body: JSON.stringify(data),
		})
	}

	async deleteWorkspace(workspaceId: string) {
		return this.request<{ message: string }>(`/workspaces/${workspaceId}`, {
			method: 'DELETE',
		})
	}

	async leaveWorkspace(workspaceId: string) {
		return this.request<{ message: string }>(`/workspaces/${workspaceId}/leave`, {
			method: 'POST',
		})
	}

	async transferOwnership(workspaceId: string, data: TransferOwnershipRequest) {
		return this.request<{ message: string }>(`/workspaces/${workspaceId}/transfer-ownership`, {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	// ============================================================================
	// Workspace Members
	// ============================================================================

	async getWorkspaceMembers(workspaceId: string) {
		return this.request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
	}

	async removeMember(workspaceId: string, userId: string) {
		return this.request<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
			method: 'DELETE',
		})
	}

	// ============================================================================
	// Invitations
	// ============================================================================

	async getInvitationLink(workspaceId: string) {
		return this.request<InvitationLink>(`/workspaces/${workspaceId}/invite`)
	}

	async updateInvitationLink(workspaceId: string, data: UpdateInvitationRequest) {
		return this.request<InvitationLink>(`/workspaces/${workspaceId}/invite`, {
			method: 'PATCH',
			body: JSON.stringify(data),
		})
	}

	async regenerateInvitationLink(workspaceId: string) {
		return this.request<InvitationLink>(`/workspaces/${workspaceId}/invite/regenerate`, {
			method: 'POST',
		})
	}

	async joinWorkspace(token: string) {
		return this.request<{ message: string; workspace_id: string; workspace_name: string }>(
			`/invite/${token}/join`,
			{
				method: 'POST',
			}
		)
	}

	// ============================================================================
	// Documents
	// ============================================================================

	async getWorkspaceDocuments(
		workspaceId: string,
		options?: {
			folderId?: string | null
			includeArchived?: boolean
			page?: number
			limit?: number
		}
	) {
		const params = new URLSearchParams()
		if (options?.folderId !== undefined) {
			params.set('folder_id', options.folderId || '')
		}
		if (options?.includeArchived) {
			params.set('archived', 'true')
		}
		if (options?.page) {
			params.set('page', options.page.toString())
		}
		if (options?.limit) {
			params.set('limit', options.limit.toString())
		}

		const query = params.toString()
		return this.request<Document[]>(
			`/workspaces/${workspaceId}/documents${query ? `?${query}` : ''}`
		)
	}

	async getDocument(documentId: string) {
		return this.request<Document>(`/documents/${documentId}`)
	}

	async createDocument(workspaceId: string, data: CreateDocumentRequest) {
		return this.request<Document>(`/workspaces/${workspaceId}/documents`, {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	async updateDocument(documentId: string, data: UpdateDocumentRequest) {
		return this.request<Document>(`/documents/${documentId}`, {
			method: 'PATCH',
			body: JSON.stringify(data),
		})
	}

	async deleteDocument(documentId: string) {
		return this.request<{ message: string }>(`/documents/${documentId}`, {
			method: 'DELETE',
		})
	}

	async updateDocumentSharing(documentId: string, data: UpdateSharingRequest) {
		return this.request<Document>(`/documents/${documentId}/share`, {
			method: 'PATCH',
			body: JSON.stringify(data),
		})
	}

	// ============================================================================
	// Folders
	// ============================================================================

	async getWorkspaceFolders(workspaceId: string) {
		return this.request<Folder[]>(`/workspaces/${workspaceId}/folders`)
	}

	async createFolder(workspaceId: string, data: CreateFolderRequest) {
		return this.request<Folder>(`/workspaces/${workspaceId}/folders`, {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	// ============================================================================
	// Search
	// ============================================================================

	async searchDocuments(query: string, workspaceId?: string, limit?: number) {
		const params = new URLSearchParams({ q: query })
		if (workspaceId) params.set('workspace_id', workspaceId)
		if (limit) params.set('limit', limit.toString())

		return this.request<SearchResult[]>(`/search?${params.toString()}`)
	}

	// ============================================================================
	// Presence
	// ============================================================================

	async getPresence(documentId: string) {
		return this.request<PresenceSession[]>(`/presence/${documentId}`)
	}

	async updatePresence(documentId: string, data: UpdatePresenceRequest, sessionId?: string) {
		return this.request<PresenceSession>(`/presence/${documentId}`, {
			method: 'POST',
			body: JSON.stringify(data),
			headers: sessionId ? { 'x-session-id': sessionId } : undefined,
		})
	}
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export class for testing/custom instances
export { ApiClient }
