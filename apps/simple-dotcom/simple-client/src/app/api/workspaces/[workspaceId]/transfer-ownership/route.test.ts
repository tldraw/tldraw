import { ErrorCodes } from '@/lib/api/errors'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

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

describe('Transfer Ownership API Route', () => {
	const mockWorkspaceId = 'test-workspace-id'
	const mockUserId = 'test-user-id'
	const mockNewOwnerId = 'new-owner-id'
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
			update: vi.fn().mockReturnThis(),
			rpc: vi.fn(),
		}

		mockCreateClient.mockResolvedValue(mockSupabase)
		mockRequireAuth.mockResolvedValue({ id: mockUserId })
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('Success Cases', () => {
		it('should successfully transfer ownership to a valid member', async () => {
			// Mock successful RPC call
			mockSupabase.rpc.mockResolvedValue({
				data: {
					success: true,
					message: 'Ownership transferred successfully',
					data: {
						workspace_id: mockWorkspaceId,
						previous_owner_id: mockUserId,
						new_owner_id: mockNewOwnerId,
					},
				},
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockNewOwnerId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.success).toBe(true)
			expect(data.message).toBe('Ownership transferred successfully')
			expect(data.data).toEqual({
				workspace_id: mockWorkspaceId,
				previous_owner_id: mockUserId,
				new_owner_id: mockNewOwnerId,
			})

			// Verify RPC was called with correct parameters
			expect(mockSupabase.rpc).toHaveBeenCalledWith('transfer_workspace_ownership', {
				p_workspace_id: mockWorkspaceId,
				p_current_owner_id: mockUserId,
				p_new_owner_id: mockNewOwnerId,
			})
		})
	})

	describe('Authentication and Authorization', () => {
		it('should reject unauthenticated requests', async () => {
			mockRequireAuth.mockResolvedValue(null)

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockNewOwnerId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(401)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
		})

		it('should reject non-owner attempts to transfer', async () => {
			// Mock RPC returning ownership error
			mockSupabase.rpc.mockResolvedValue({
				data: {
					success: false,
					error: 'Workspace not found or you are not the owner',
					code: 'WORKSPACE_NOT_FOUND',
				},
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockNewOwnerId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(403)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.WORKSPACE_OWNERSHIP_REQUIRED)
		})
	})

	describe('Validation Errors', () => {
		it('should reject requests without new_owner_id', async () => {
			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: {},
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.MISSING_REQUIRED_FIELD)
			expect(data.error.message).toContain('new_owner_id is required')
		})

		it('should reject transfer to non-member', async () => {
			// Mock RPC returning invalid new owner error
			mockSupabase.rpc.mockResolvedValue({
				data: {
					success: false,
					error: 'New owner must be an existing workspace member',
					code: 'INVALID_NEW_OWNER',
				},
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: 'non-member-id' },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.INVALID_INPUT)
			expect(data.error.message).toContain('existing workspace member')
		})

		it('should reject self-transfer', async () => {
			// Mock RPC returning self-transfer error
			mockSupabase.rpc.mockResolvedValue({
				data: {
					success: false,
					error: 'Cannot transfer ownership to yourself',
					code: 'SELF_TRANSFER',
				},
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockUserId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.INVALID_INPUT)
			expect(data.error.message).toContain('Cannot transfer ownership to yourself')
		})
	})

	describe('Workspace Restrictions', () => {
		it('should reject transfer of private workspace', async () => {
			// Mock RPC returning private workspace error
			mockSupabase.rpc.mockResolvedValue({
				data: {
					success: false,
					error: 'Cannot transfer ownership of private workspace',
					code: 'CANNOT_TRANSFER_PRIVATE',
				},
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockNewOwnerId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(403)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.CANNOT_DELETE_PRIVATE_WORKSPACE)
			expect(data.error.message).toContain('private workspace')
		})

		it('should handle workspace not found', async () => {
			// Mock RPC returning workspace not found
			mockSupabase.rpc.mockResolvedValue({
				data: {
					success: false,
					error: 'Workspace not found or you are not the owner',
					code: 'WORKSPACE_NOT_FOUND',
				},
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/non-existent-id/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockNewOwnerId },
			})

			const response = await POST(request as unknown as NextRequest, {
				params: Promise.resolve({ workspaceId: 'non-existent-id' }),
			})
			const data = await response.json()

			// Should return 404 when workspace genuinely doesn't exist
			expect([403, 404]).toContain(response.status)
			expect(data.success).toBe(false)
		})
	})

	describe('Transaction Atomicity', () => {
		it('should handle database errors gracefully', async () => {
			// Mock RPC call failing
			mockSupabase.rpc.mockResolvedValue({
				data: null,
				error: { message: 'Database connection error' },
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockNewOwnerId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(500)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
			expect(data.error.message).toContain('Database connection error')
		})

		it('should handle unexpected database function errors', async () => {
			// Mock RPC returning unexpected error format
			mockSupabase.rpc.mockResolvedValue({
				data: {
					success: false,
					error: 'Transaction failed due to constraint violation',
					code: 'TRANSFER_FAILED',
				},
				error: null,
			})

			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: mockNewOwnerId },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(500)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
			expect(data.error.message).toContain('Transaction failed')
		})
	})

	describe('Edge Cases', () => {
		it('should handle malformed request body', async () => {
			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: 'not-json',
			})

			// Override json() to throw error
			;(request as unknown as NextRequest).json = vi
				.fn()
				.mockRejectedValue(new Error('Invalid JSON'))

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(500)
			expect(data.success).toBe(false)
		})

		it('should handle null new_owner_id', async () => {
			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: null },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.MISSING_REQUIRED_FIELD)
		})

		it('should handle empty string new_owner_id', async () => {
			const request = new MockNextRequest(`/api/workspaces/${mockWorkspaceId}/transfer-ownership`, {
				method: 'POST',
				body: { new_owner_id: '' },
			})

			const response = await POST(request as unknown as NextRequest, mockContext)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.success).toBe(false)
			expect(data.error.code).toBe(ErrorCodes.MISSING_REQUIRED_FIELD)
		})
	})
})
