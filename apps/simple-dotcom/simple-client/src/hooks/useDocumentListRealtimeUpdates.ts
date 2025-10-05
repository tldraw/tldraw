'use client'

// useDocumentListRealtimeUpdates Hook
// Subscribes to document list changes in a workspace

import type { RealtimeEvent } from '@/lib/realtime/types'
import { useCallback } from 'react'
import { useWorkspaceRealtimeUpdates } from './useWorkspaceRealtimeUpdates'

interface UseDocumentListRealtimeUpdatesOptions {
	onDocumentCreated?: (documentId: string, name: string, folderId?: string | null) => void
	onDocumentUpdated?: (
		documentId: string,
		updates: { name?: string; folderId?: string | null }
	) => void
	onDocumentArchived?: (documentId: string) => void
	onDocumentRestored?: (documentId: string) => void
	onDocumentDeleted?: (documentId: string) => void
	onRefetch?: () => void
	enabled?: boolean
}

/**
 * Hook to subscribe to document list changes in a workspace
 * Wraps useWorkspaceRealtimeUpdates with document-specific handlers
 *
 * @param workspaceId - The workspace ID to subscribe to
 * @param options - Document-specific event handlers
 * @returns Object with subscription status
 */
export function useDocumentListRealtimeUpdates(
	workspaceId: string | null | undefined,
	options: UseDocumentListRealtimeUpdatesOptions = {}
) {
	const {
		onDocumentCreated,
		onDocumentUpdated,
		onDocumentArchived,
		onDocumentRestored,
		onDocumentDeleted,
		onRefetch,
		enabled = true,
	} = options

	// Handle document change events
	const handleDocumentChange = useCallback(
		(event: RealtimeEvent) => {
			const payload = event.payload as any

			switch (event.type) {
				case 'document.created':
					onDocumentCreated?.(payload.documentId, payload.name, payload.folderId)
					break

				case 'document.updated':
					onDocumentUpdated?.(payload.documentId, {
						name: payload.name,
						folderId: payload.folderId,
					})
					break

				case 'document.archived':
					onDocumentArchived?.(payload.documentId)
					break

				case 'document.restored':
					onDocumentRestored?.(payload.documentId)
					break

				case 'document.deleted':
					onDocumentDeleted?.(payload.documentId)
					break
			}
		},
		[
			onDocumentCreated,
			onDocumentUpdated,
			onDocumentArchived,
			onDocumentRestored,
			onDocumentDeleted,
		]
	)

	// Use the workspace realtime hook with document-specific handlers
	const { isSubscribed, refresh } = useWorkspaceRealtimeUpdates(workspaceId, {
		onDocumentChange: handleDocumentChange,
		onReconnect: onRefetch,
		enabled,
	})

	return {
		isSubscribed,
		refresh,
	}
}
