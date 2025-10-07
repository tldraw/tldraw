/**
 * Integration Tests for Folder CRUD API Routes
 * Tests folder creation, listing, depth validation, and cycle prevention
 */

import { ErrorCodes } from '@/lib/api/errors'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

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

describe('Folders API Routes', () => {
	const mockWorkspaceId = 'test-workspace-id'
	const mockUserId = 'test-user-id'
	const mockFolderId = 'test-folder-id'
	const mockParentFolderId = 'test-parent-folder-id'
	const mockContext = {
		params: Promise.resolve({ workspaceId: mockWorkspaceId }),
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
			insert: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
		}

		mockCreateClient.mockResolvedValue(mockSupabase)
		mockRequireAuth.mockResolvedValue({ id: mockUserId })
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('GET /api/workspaces/:workspaceId/folders', () => {
		it('should list folders in workspace for authorized member', async () => {
			const mockFolders = [
				{
					id: 'folder-1',
					workspace_id: mockWorkspaceId,
					parent_folder_id: null,
					name: 'Folder 1',
					created_by: mockUserId,
					created_at: '2025-01-01T00:00:00Z',
					updated_at: '2025-01-01T00:00:00Z',
				},
				{
					id: 'folder-2',
					workspace_id: mockWorkspaceId,
					parent_folder_id: 'folder-1',
					name: 'Folder 2',
					created_by: mockUserId,
					created_at: '2025-01-01T00:00:00Z',
					updated_at: '2025-01-01T00:00:00Z',
				},
			]

			// Mock membership check
			mockSupabase.single.mockResolvedValueOnce({
				data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
				error: null,
			})

			// Mock folders query
			mockSupabase.single.mockResolvedValueOnce({
				data: mockFolders,
				error: null,
			})

			// Mock order to return folders directly
			mockSupabase.order.mockResolvedValue({
				data: mockFolders,
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'GET',
			})

			const response = await GET(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.data).toHaveLength(2)
		})

		it('should return 403 for non-member', async () => {
			mockSupabase.single.mockResolvedValueOnce({
				data: null,
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'GET',
			})

			const response = await GET(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(403)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FORBIDDEN)
		})
	})

	describe('POST /api/workspaces/:workspaceId/folders', () => {
		it('should create root-level folder', async () => {
			const mockFolder = {
				id: mockFolderId,
				workspace_id: mockWorkspaceId,
				parent_folder_id: null,
				name: 'New Folder',
				created_by: mockUserId,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			}

			// Mock membership check
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				// Mock insert single result
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'POST',
				body: { name: 'New Folder' },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(201)
			expect(data.success).toBe(true)
			expect(data.data.name).toBe('New Folder')
			expect(data.data.parent_folder_id).toBe(null)
		})

		it('should create nested folder with valid parent', async () => {
			const mockFolder = {
				id: mockFolderId,
				workspace_id: mockWorkspaceId,
				parent_folder_id: mockParentFolderId,
				name: 'Nested Folder',
				created_by: mockUserId,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			}

			// Mock membership check
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				// Mock parent folder check
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId },
					error: null,
				})
				// Mock depth check - parent folder has no parent (depth 1)
				.mockResolvedValueOnce({
					data: { parent_folder_id: null, workspace_id: mockWorkspaceId },
					error: null,
				})
				// Mock insert single result
				.mockResolvedValueOnce({
					data: mockFolder,
					error: null,
				})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'POST',
				body: { name: 'Nested Folder', parent_folder_id: mockParentFolderId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(201)
			expect(data.success).toBe(true)
			expect(data.data.parent_folder_id).toBe(mockParentFolderId)
		})

		it('should reject folder creation with invalid name', async () => {
			mockSupabase.single.mockResolvedValueOnce({
				data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'POST',
				body: { name: '' },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.MISSING_REQUIRED_FIELD)
		})

		it('should reject folder with non-existent parent', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				// Mock parent folder not found
				.mockResolvedValueOnce({
					data: null,
					error: null,
				})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'POST',
				body: { name: 'Test', parent_folder_id: 'non-existent' },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(404)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FOLDER_NOT_FOUND)
		})

		it('should reject folder with parent in different workspace', async () => {
			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				// Mock parent folder in different workspace
				.mockResolvedValueOnce({
					data: { workspace_id: 'different-workspace' },
					error: null,
				})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'POST',
				body: { name: 'Test', parent_folder_id: mockParentFolderId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(409)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FOLDER_NOT_IN_WORKSPACE)
		})

		it('should reject folder creation at depth limit (10 levels)', async () => {
			// Create a chain of 10 folders
			const folderChain = Array.from({ length: 10 }, (_, i) => ({
				id: `folder-${i}`,
				parent_folder_id: i === 0 ? null : `folder-${i - 1}`,
				workspace_id: mockWorkspaceId,
			}))

			mockSupabase.single
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId, user_id: mockUserId },
					error: null,
				})
				// Mock parent folder check
				.mockResolvedValueOnce({
					data: { workspace_id: mockWorkspaceId },
					error: null,
				})

			// Mock depth check - return each folder in chain
			for (let i = 9; i >= 0; i--) {
				mockSupabase.single.mockResolvedValueOnce({
					data: folderChain[i],
					error: null,
				})
			}

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/folders`, {
				method: 'POST',
				body: { name: 'Too Deep', parent_folder_id: 'folder-9' },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.FOLDER_DEPTH_EXCEEDED)
		})
	})
})
