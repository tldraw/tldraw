/**
 * Integration Tests for Individual Folder API Routes
 * Tests folder updates (rename/move), deletion, and validation edge cases
 */

import { ErrorCodes } from '@/lib/api/errors'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, PATCH } from './route'

// Mock the Supabase server module
vi.mock('@/lib/supabase/server', () => ({
	requireAuth: vi.fn(),
	createClient: vi.fn(),
}))

// Mock NextRequest
class MockNextRequest {
	constructor(
		public url: string,
		public options: { method: string; body?: unknown; headers?: unknown } = { method: 'GET' }
	) {}
	async json() {
		return this.options.body
	}
}

describe('Individual Folder API Routes', () => {
	const mockWorkspaceId = 'test-workspace-id'
	const mockUserId = 'test-user-id'
	const mockFolderId = 'test-folder-id'
	const mockParentFolderId = 'test-parent-folder-id'
	const mockContext = {
		params: Promise.resolve({ workspaceId: mockWorkspaceId, folderId: mockFolderId }),
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockSupabase: any
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockRequireAuth: any
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockCreateClient: any

	beforeEach(async () => {
		const serverModule = await import('@/lib/supabase/server')
		mockRequireAuth = vi.mocked(serverModule.requireAuth)
		mockCreateClient = vi.mocked(serverModule.createClient)

		// Setup default mock Supabase client
		mockSupabase = {
			from: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
		}

		mockCreateClient.mockResolvedValue(mockSupabase)
		mockRequireAuth.mockResolvedValue({ id: mockUserId })
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('GET /api/workspaces/:workspaceId/folders/:folderId', () => {
		it('should get folder details', async () => {
			const mockFolder = {
				id: mockFolderId,
				workspace_id: mockWorkspaceId,
				parent_folder_id: null,
				name: 'Test Folder',
				created_by: mockUserId,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			}

			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{ method: 'GET' }
			)

			const response = await GET(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.data.id).toBe(mockFolderId)
		})

		it('should return 404 for non-existent folder', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: null,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{ method: 'GET' }
			)

			const response = await GET(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(404)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FOLDER_NOT_FOUND)
		})
	})

	describe('PATCH /api/workspaces/:workspaceId/folders/:folderId', () => {
		const mockFolder = {
			id: mockFolderId,
			workspace_id: mockWorkspaceId,
			parent_folder_id: null,
			name: 'Original Name',
			created_by: mockUserId,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
		}

		it('should rename folder', async () => {
			const updatedFolder = { ...mockFolder, name: 'New Name' }

			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})
				.mockResolvedValueOnce({
					data: updatedFolder,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{
					method: 'PATCH',
					body: { name: 'New Name' },
				}
			)

			const response = await PATCH(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.data.name).toBe('New Name')
		})

		it('should reject empty name', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{
					method: 'PATCH',
					body: { name: '' },
				}
			)

			const response = await PATCH(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.INVALID_INPUT)
		})

		it('should move folder to new parent', async () => {
			const updatedFolder = { ...mockFolder, parent_folder_id: mockParentFolderId }

			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})
				// Parent folder check
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId },
					error: null,
				})
				// Cycle check - parent has no parent
				.mockResolvedValueOnce({
					data: { parent_folder_id: null },
					error: null,
				})
				// Depth check
				.mockResolvedValueOnce({
					data: { parent_folder_id: null, workspace_id: mockWorkspaceId },
					error: null,
				})
				// Children query for subtree depth
				.mockResolvedValueOnce({
					data: [],
					error: null,
				})
				// No children query
				.mockResolvedValueOnce({
					data: [],
					error: null,
				})
				// Update result
				.mockResolvedValueOnce({
					data: updatedFolder,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{
					method: 'PATCH',
					body: { parent_folder_id: mockParentFolderId },
				}
			)

			const response = await PATCH(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.data.parent_folder_id).toBe(mockParentFolderId)
		})

		it('should reject setting self as parent', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{
					method: 'PATCH',
					body: { parent_folder_id: mockFolderId },
				}
			)

			const response = await PATCH(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FOLDER_CYCLE_DETECTED)
		})

		it('should reject move that would create a cycle', async () => {
			const childFolderId = 'child-folder-id'

			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})
				// Parent folder check
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId },
					error: null,
				})
				// Cycle check - parent points back to this folder
				.mockResolvedValueOnce({
					data: { parent_folder_id: mockFolderId },
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{
					method: 'PATCH',
					body: { parent_folder_id: childFolderId },
				}
			)

			const response = await PATCH(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FOLDER_CYCLE_DETECTED)
		})

		it('should return unchanged folder when no updates provided', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{
					method: 'PATCH',
					body: {},
				}
			)

			const response = await PATCH(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.data).toEqual(mockFolder)
		})
	})

	describe('DELETE /api/workspaces/:workspaceId/folders/:folderId', () => {
		it('should delete folder', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: null,
						name: 'Folder to Delete',
					},
					error: null,
				})

			mockSupabase.delete.mockResolvedValue({
				data: null,
				error: null,
			})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{ method: 'DELETE' }
			)

			const response = await DELETE(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.data.message).toBe('Folder deleted successfully')
		})

		it('should return 404 for non-existent folder', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				.mockResolvedValueOnce({
					data: null,
					error: null,
				})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{ method: 'DELETE' }
			)

			const response = await DELETE(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(404)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FOLDER_NOT_FOUND)
		})

		it('should return 403 for non-member', async () => {
			mockSupabase.single.mockResolvedValueOnce({
				data: null,
				error: null,
			})

			const request = new MockNextRequest(
				`/api/workspaces/${mockWorkspaceId}/folders/${mockFolderId}`,
				{ method: 'DELETE' }
			)

			const response = await DELETE(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(403)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FORBIDDEN)
		})
	})
})
