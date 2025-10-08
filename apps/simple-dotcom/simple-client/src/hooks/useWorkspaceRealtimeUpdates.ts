'use client'

// useWorkspaceRealtimeUpdates Hook
// Subscribes to real-time updates for a workspace and handles events

import { CHANNEL_PATTERNS } from '@/lib/realtime/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef } from 'react'

interface UseWorkspaceRealtimeUpdatesOptions {
	onChange?: () => void
	enabled?: boolean
}

/**
 * Hook to subscribe to real-time updates for a workspace
 *
 * Handles all workspace events (documents, folders, members, workspace updates)
 * with a single onChange callback for simplicity. The hybrid realtime strategy
 * (Broadcast + React Query polling) ensures missed events are caught.
 *
 * @param workspaceId - The workspace ID to subscribe to
 * @param options - onChange callback and configuration
 */
export function useWorkspaceRealtimeUpdates(
	workspaceId: string | null | undefined,
	options: UseWorkspaceRealtimeUpdatesOptions = {}
): void {
	const { onChange, enabled = true } = options

	const channelRef = useRef<RealtimeChannel | null>(null)
	const supabase = getBrowserClient()

	// Handle incoming events
	const handleEvent = useCallback(() => {
		onChange?.()
	}, [onChange])

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
				} else if (status === 'CLOSED') {
					console.log(`Channel closed for workspace ${workspaceId}`)
				}
			})

		// Store channel reference
		channelRef.current = channel

		// Cleanup on unmount
		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				channelRef.current = null
			}
		}
	}, [workspaceId, enabled, handleEvent, supabase])
}
