'use client'

// useWorkspaceRealtimeUpdates Hook
// Subscribes to real-time Broadcast events for workspace-related changes

import { CHANNEL_PATTERNS } from '@/lib/realtime/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useRef } from 'react'

interface UseWorkspaceRealtimeUpdatesOptions {
	onChange?: () => void
	enabled?: boolean
}

/**
 * Hook to subscribe to workspace-level broadcast events
 *
 * Part of the hybrid realtime strategy:
 * - Primary: Supabase Realtime Broadcast (instant updates via WebSocket)
 * - Fallback: React Query polling (10-15 second intervals in parent component)
 *
 * Listens to broadcast events on the workspace channel for:
 * - Document changes (created, updated, archived, deleted, moved)
 * - Folder changes (created, updated, deleted)
 * - Member changes (added, removed, updated)
 * - Workspace metadata changes (updated, archived)
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
	const onChangeRef = useRef(onChange)
	const supabase = getBrowserClient()

	// Keep onChangeRef current without triggering re-subscriptions
	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	useEffect(() => {
		// Skip if no workspace ID or disabled
		if (!workspaceId || !enabled) {
			return
		}

		const channelName = CHANNEL_PATTERNS.workspace(workspaceId)

		// Subscribe to broadcast events on workspace channel
		const channel = supabase
			.channel(channelName)
			.on('broadcast', { event: 'workspace_event' }, (payload) => {
				// Trigger React Query invalidation for any workspace event
				onChangeRef.current?.()
			})
			.subscribe()

		// Store channel reference
		channelRef.current = channel

		// Cleanup on unmount
		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				channelRef.current = null
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workspaceId, enabled])
}
