import { ErrorCodes } from '@/lib/api/errors'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, PATCH } from './route'

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

describe('Folder PATCH/DELETE API Routes', () => {
	const mockUserId = 'test-user-id'
	const mockWorkspaceId = 'test-workspace-id'
	const mockFolderId = 'test-folder-id'
	const mockParentFolderId = 'parent-folder-id'
	const mockContext = {
		params: Promise.resolve({ folderId: mockFolderId }),
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

	describe('PATCH /api/folders/:folderId', () => {
		describe('Success Cases', () => {
			it('should successfully update folder name', async () => {
				const updatedName = 'Updated Folder Name'

				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: null,
						name: 'Old Name',
						workspace: {
							id: mockWorkspaceId,
							name: 'Test Workspace',
						},
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				// Mock update
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						name: updatedName,
						parent_folder_id: null,
					},
					error: null,
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { name: updatedName },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(200)
				expect(data.success).toBe(true)
				expect(data.data.name).toBe(updatedName)
			})

			it('should successfully move folder to root (null parent)', async () => {
				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: mockParentFolderId,
						name: 'Test Folder',
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				// Mock update
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: null,
						name: 'Test Folder',
					},
					error: null,
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { parent_folder_id: null },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(200)
				expect(data.success).toBe(true)
				expect(data.data.parent_folder_id).toBeNull()
			})
		})

		describe('Cycle Detection', () => {
			it('should reject moving folder into itself', async () => {
				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: null,
						name: 'Test Folder',
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				// Mock parent folder check (same as folder itself)
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						workspace_id: mockWorkspaceId,
					},
					error: null,
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { parent_folder_id: mockFolderId }, // Self-reference
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(400)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FOLDER_CYCLE_DETECTED)
				expect(data.error.message).toContain('circular reference')
			})

			it('should reject moving folder into its own descendant', async () => {
				const childFolderId = 'child-folder-id'
				const grandchildFolderId = 'grandchild-folder-id'

				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: null,
						name: 'Parent Folder',
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				// Mock new parent folder (grandchild)
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						workspace_id: mockWorkspaceId,
					},
					error: null,
				})

				// Mock cycle detection: grandchild -> child -> parent (mockFolderId)
				mockSupabase.single
					.mockResolvedValueOnce({
						data: {
							parent_folder_id: childFolderId, // grandchild's parent is child
						},
						error: null,
					})
					.mockResolvedValueOnce({
						data: {
							parent_folder_id: mockFolderId, // child's parent is the folder being moved
						},
						error: null,
					})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { parent_folder_id: grandchildFolderId },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(400)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FOLDER_CYCLE_DETECTED)
			})
		})

		describe('Depth Validation', () => {
			it('should reject moving folder that would exceed max depth', async () => {
				const deepFolderId = 'deep-folder-id'

				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: null,
						name: 'Test Folder',
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				// Mock new parent folder validation
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						workspace_id: mockWorkspaceId,
					},
					error: null,
				})

				// Mock cycle check - will traverse parents starting from deepFolderId
				// Should not find the folder being moved (mockFolderId) in the parent chain
				for (let i = 0; i < 10; i++) {
					mockSupabase.single.mockResolvedValueOnce({
						data: {
							parent_folder_id: i === 9 ? null : `cycle-check-parent-${i + 1}`,
						},
						error: null,
					})
				}

				// Mock depth calculation: traverse 10 levels deep to hit limit
				// The getFolderDepth function will query each parent starting from deepFolderId
				for (let i = 0; i < 10; i++) {
					mockSupabase.single.mockResolvedValueOnce({
						data: {
							parent_folder_id: i === 9 ? null : `parent-${i + 1}`,
							workspace_id: mockWorkspaceId,
						},
						error: null,
					})
				}

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { parent_folder_id: deepFolderId },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(400)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FOLDER_DEPTH_EXCEEDED)
				expect(data.error.message).toContain('maximum depth')
			})
		})

		describe('Workspace Boundaries', () => {
			it('should reject moving folder to parent in different workspace', async () => {
				const otherWorkspaceId = 'other-workspace-id'

				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						parent_folder_id: null,
						name: 'Test Folder',
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				// Mock new parent folder in different workspace
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						workspace_id: otherWorkspaceId,
					},
					error: null,
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { parent_folder_id: 'parent-in-other-workspace' },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(409)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FOLDER_NOT_IN_WORKSPACE)
			})
		})

		describe('Validation Errors', () => {
			it('should reject empty folder name', async () => {
				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						name: 'Old Name',
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { name: '   ' },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(400)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.INVALID_INPUT)
			})

			it('should reject when parent folder not found', async () => {
				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				mockSupabase.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				// Mock parent not found
				mockSupabase.single.mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116' },
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { parent_folder_id: 'non-existent-folder' },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(404)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FOLDER_NOT_FOUND)
			})
		})

		describe('Authorization', () => {
			it('should reject unauthenticated requests', async () => {
				mockRequireAuth.mockRejectedValue(
					new (await import('@/lib/api/errors')).ApiException(
						401,
						ErrorCodes.UNAUTHORIZED,
						'Unauthorized'
					)
				)

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { name: 'New Name' },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(401)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
			})

			it('should reject users without workspace access', async () => {
				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check - not a member
				mockSupabase.single.mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116' },
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'PATCH',
					body: { name: 'New Name' },
				})

				const response = await PATCH(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(403)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FORBIDDEN)
			})
		})
	})

	describe('DELETE /api/folders/:folderId', () => {
		describe('Success Cases', () => {
			it('should successfully delete folder', async () => {
				// Setup delete mock chain
				const deleteMock = {
					eq: vi.fn().mockResolvedValue({ error: null }),
				}
				const fromMock = {
					delete: vi.fn().mockReturnValue(deleteMock),
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn(),
				}
				mockSupabase.from = vi.fn().mockReturnValue(fromMock)

				// Mock fetching existing folder
				fromMock.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						name: 'Folder to Delete',
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check
				fromMock.single.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'DELETE',
				})

				const response = await DELETE(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(200)
				expect(data.success).toBe(true)
				expect(data.data.success).toBe(true)
			})
		})

		describe('Authorization', () => {
			it('should reject unauthenticated requests', async () => {
				mockRequireAuth.mockRejectedValue(
					new (await import('@/lib/api/errors')).ApiException(
						401,
						ErrorCodes.UNAUTHORIZED,
						'Unauthorized'
					)
				)

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'DELETE',
				})

				const response = await DELETE(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(401)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
			})

			it('should reject users without workspace access', async () => {
				// Mock fetching existing folder
				mockSupabase.single.mockResolvedValueOnce({
					data: {
						id: mockFolderId,
						workspace_id: mockWorkspaceId,
						workspace: { id: mockWorkspaceId },
					},
					error: null,
				})

				// Mock membership check - not a member
				mockSupabase.single.mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116' },
				})

				const request = new MockNextRequest(`/api/folders/${mockFolderId}`, {
					method: 'DELETE',
				})

				const response = await DELETE(request as unknown as NextRequest, mockContext)
				const data = await response.json()

				expect(response.status).toBe(403)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FORBIDDEN)
			})
		})

		describe('Not Found', () => {
			it('should handle folder not found', async () => {
				// Mock fetching non-existent folder
				mockSupabase.single.mockResolvedValueOnce({
					data: null,
					error: { code: 'PGRST116' },
				})

				const request = new MockNextRequest(`/api/folders/non-existent-id`, {
					method: 'DELETE',
				})

				const response = await DELETE(request as unknown as NextRequest, {
					params: Promise.resolve({ folderId: 'non-existent-id' }),
				})
				const data = await response.json()

				expect(response.status).toBe(404)
				expect(data.success).toBe(false)
				expect(data.error.code).toBe(ErrorCodes.FOLDER_NOT_FOUND)
			})
		})
	})
})
