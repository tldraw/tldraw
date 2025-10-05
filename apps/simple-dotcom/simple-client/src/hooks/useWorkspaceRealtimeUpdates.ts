'use client'

// useWorkspaceRealtimeUpdates Hook
// Subscribes to real-time updates for a workspace and handles events

import { CHANNEL_PATTERNS, type RealtimeEvent } from '@/lib/realtime/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef } from 'react'

interface UseWorkspaceRealtimeUpdatesOptions {
	onWorkspaceUpdate?: (event: RealtimeEvent) => void
	onMemberChange?: (event: RealtimeEvent) => void
	onDocumentChange?: (event: RealtimeEvent) => void
	onFolderChange?: (event: RealtimeEvent) => void
	onReconnect?: () => void
	onError?: (error: Error) => void
	enabled?: boolean
}

/**
 * Hook to subscribe to real-time updates for a workspace
 *
 * @param workspaceId - The workspace ID to subscribe to
 * @param options - Event handlers and configuration
 * @returns Object with subscription status and manual refresh function
 */
export function useWorkspaceRealtimeUpdates(
	workspaceId: string | null | undefined,
	options: UseWorkspaceRealtimeUpdatesOptions = {}
) {
	const {
		onWorkspaceUpdate,
		onMemberChange,
		onDocumentChange,
		onFolderChange,
		onReconnect,
		onError,
		enabled = true,
	} = options

	const channelRef = useRef<RealtimeChannel | null>(null)
	const supabase = getBrowserClient()

	// Handle incoming events
	const handleEvent = useCallback(
		(payload: any) => {
			try {
				const event = payload as RealtimeEvent

				// Route event to appropriate handler based on type
				if (event.type?.startsWith('workspace.')) {
					onWorkspaceUpdate?.(event)
				} else if (event.type?.startsWith('member.')) {
					onMemberChange?.(event)
				} else if (event.type?.startsWith('document.')) {
					onDocumentChange?.(event)
				} else if (event.type?.startsWith('folder.')) {
					onFolderChange?.(event)
				}
			} catch (error) {
				console.error('Error handling realtime event:', error)
				onError?.(error as Error)
			}
		},
		[onWorkspaceUpdate, onMemberChange, onDocumentChange, onFolderChange, onError]
	)

	// Manual refresh function (useful after reconnection)
	const refresh = useCallback(() => {
		onReconnect?.()
	}, [onReconnect])

	useEffect(() => {
		// Skip if no workspace ID or disabled
		if (!workspaceId || !enabled) {
			return
		}

		// Create channel and subscribe
		const channel = supabase
			.channel(CHANNEL_PATTERNS.workspace(workspaceId))
			.on('broadcast', { event: 'workspace_event' }, handleEvent)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					console.log(`Subscribed to workspace ${workspaceId} realtime updates`)
				} else if (status === 'CHANNEL_ERROR') {
					console.error(`Failed to subscribe to workspace ${workspaceId}`)
					onError?.(new Error('Failed to subscribe to realtime updates'))
				} else if (status === 'CLOSED') {
					console.log(`Channel closed for workspace ${workspaceId}`)
				}
			})

		// Store channel reference
		channelRef.current = channel

		// Handle reconnection
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && channelRef.current) {
				// When tab becomes visible, trigger reconnect callback
				// This allows the UI to refetch data to catch up on missed events
				refresh()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		// Cleanup on unmount
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)

			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				channelRef.current = null
			}
		}
	}, [workspaceId, enabled, handleEvent, refresh, onError, supabase])

	return {
		isSubscribed: !!channelRef.current,
		refresh,
	}
}
