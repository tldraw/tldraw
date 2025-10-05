// Unit tests for real-time broadcast utilities

import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	broadcastDocumentEvent,
	broadcastFolderEvent,
	broadcastMemberEvent,
	broadcastWorkspaceEvent,
} from './broadcast'

describe('Broadcast Utilities', () => {
	let mockSupabase: SupabaseClient
	let mockChannel: any

	beforeEach(() => {
		// Reset mocks
		mockChannel = {
			send: vi.fn().mockResolvedValue({ success: true }),
		}

		mockSupabase = {
			channel: vi.fn().mockReturnValue(mockChannel),
			removeChannel: vi.fn().mockResolvedValue(undefined),
		} as unknown as SupabaseClient
	})

	describe('broadcastWorkspaceEvent', () => {
		it('should broadcast workspace update event', async () => {
			const result = await broadcastWorkspaceEvent(
				mockSupabase,
				'workspace-123',
				'workspace.updated',
				{ workspaceId: 'workspace-123', name: 'Updated Name' },
				'user-456'
			)

			expect(result.success).toBe(true)
			expect(mockSupabase.channel).toHaveBeenCalledWith('workspace:workspace-123')
			expect(mockChannel.send).toHaveBeenCalledWith({
				type: 'broadcast',
				event: 'workspace_event',
				payload: expect.objectContaining({
					type: 'workspace.updated',
					payload: expect.objectContaining({
						workspaceId: 'workspace-123',
						name: 'Updated Name',
					}),
					actor_id: 'user-456',
					timestamp: expect.any(String),
				}),
			})
			expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
		})

		it('should handle broadcast errors gracefully', async () => {
			mockChannel.send.mockRejectedValue(new Error('Network error'))

			const result = await broadcastWorkspaceEvent(
				mockSupabase,
				'workspace-123',
				'workspace.updated',
				{ workspaceId: 'workspace-123' },
				'user-456'
			)

			expect(result.success).toBe(false)
			expect(result.error).toBeDefined()
		})
	})

	describe('broadcastDocumentEvent', () => {
		it('should broadcast document created event through workspace channel', async () => {
			await broadcastDocumentEvent(
				mockSupabase,
				'doc-789',
				'workspace-123',
				'document.created',
				{ name: 'New Document', workspaceId: 'workspace-123' },
				'user-456'
			)

			expect(mockSupabase.channel).toHaveBeenCalledWith('workspace:workspace-123')
			expect(mockChannel.send).toHaveBeenCalledWith({
				type: 'broadcast',
				event: 'workspace_event',
				payload: expect.objectContaining({
					type: 'document.created',
					payload: expect.objectContaining({
						documentId: 'doc-789',
						name: 'New Document',
						workspaceId: 'workspace-123',
					}),
				}),
			})
		})

		it('should broadcast document archived event', async () => {
			await broadcastDocumentEvent(
				mockSupabase,
				'doc-789',
				'workspace-123',
				'document.archived',
				{ workspaceId: 'workspace-123', isArchived: true },
				'user-456'
			)

			expect(mockChannel.send).toHaveBeenCalledWith({
				type: 'broadcast',
				event: 'workspace_event',
				payload: expect.objectContaining({
					type: 'document.archived',
					payload: expect.objectContaining({
						documentId: 'doc-789',
						isArchived: true,
					}),
				}),
			})
		})
	})

	describe('broadcastMemberEvent', () => {
		it('should broadcast member added event', async () => {
			await broadcastMemberEvent(
				mockSupabase,
				'workspace-123',
				'member.added',
				'new-user-999',
				'member',
				'user-456'
			)

			expect(mockChannel.send).toHaveBeenCalledWith({
				type: 'broadcast',
				event: 'workspace_event',
				payload: expect.objectContaining({
					type: 'member.added',
					payload: expect.objectContaining({
						workspaceId: 'workspace-123',
						userId: 'new-user-999',
						role: 'member',
						action: 'added',
					}),
				}),
			})
		})

		it('should broadcast member removed event', async () => {
			await broadcastMemberEvent(
				mockSupabase,
				'workspace-123',
				'member.removed',
				'old-user-888',
				undefined,
				'user-456'
			)

			expect(mockChannel.send).toHaveBeenCalledWith({
				type: 'broadcast',
				event: 'workspace_event',
				payload: expect.objectContaining({
					type: 'member.removed',
					payload: expect.objectContaining({
						userId: 'old-user-888',
						action: 'removed',
					}),
				}),
			})
		})
	})

	describe('broadcastFolderEvent', () => {
		it('should broadcast folder created event', async () => {
			await broadcastFolderEvent(
				mockSupabase,
				'folder-111',
				'workspace-123',
				'folder.created',
				{ name: 'New Folder', parentId: null },
				'user-456'
			)

			expect(mockChannel.send).toHaveBeenCalledWith({
				type: 'broadcast',
				event: 'workspace_event',
				payload: expect.objectContaining({
					type: 'folder.created',
					payload: expect.objectContaining({
						folderId: 'folder-111',
						workspaceId: 'workspace-123',
						name: 'New Folder',
						parentId: null,
						action: 'created',
					}),
				}),
			})
		})

		it('should broadcast folder updated event', async () => {
			await broadcastFolderEvent(
				mockSupabase,
				'folder-111',
				'workspace-123',
				'folder.updated',
				{ name: 'Renamed Folder' },
				'user-456'
			)

			expect(mockChannel.send).toHaveBeenCalledWith({
				type: 'broadcast',
				event: 'workspace_event',
				payload: expect.objectContaining({
					type: 'folder.updated',
					payload: expect.objectContaining({
						folderId: 'folder-111',
						name: 'Renamed Folder',
						action: 'updated',
					}),
				}),
			})
		})
	})
})
