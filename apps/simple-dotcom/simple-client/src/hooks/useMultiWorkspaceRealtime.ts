'use client'

// useMultiWorkspaceRealtime Hook
// Manages realtime subscriptions for multiple workspaces simultaneously
// Used by the dashboard to receive updates for all user's workspaces

import { CHANNEL_PATTERNS, type RealtimeEvent } from '@/lib/realtime/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

interface UseMultiWorkspaceRealtimeOptions {
	userId: string
	workspaceIds: string[]
	enabled?: boolean
}

/**
 * Hook to subscribe to real-time updates for multiple workspaces
 * Uses the broadcast pattern as documented in README.md
 *
 * This replaces the old useDashboardRealtime hook which incorrectly
 * used postgres_changes instead of the broadcast pattern.
 *
 * @param options - Configuration including userId and workspace IDs
 * @returns Object with subscription status
 */
export function useMultiWorkspaceRealtime({
	userId,
	workspaceIds,
	enabled = true,
}: UseMultiWorkspaceRealtimeOptions) {
	const queryClient = useQueryClient()
	const supabase = getBrowserClient()
	const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
	const isSubscribedRef = useRef(false)

	// Handle incoming events from any workspace
	const handleWorkspaceEvent = useCallback(
		(workspaceId: string) => (payload: any) => {
			try {
				const event = payload as RealtimeEvent

				// Invalidate dashboard query to refetch all data
				// This ensures the dashboard stays in sync with all workspace changes
				queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
			} catch (error) {
				// Silently fail - React Query polling will catch up
			}
		},
		[queryClient, userId]
	)

	// Handle reconnection after tab becomes visible
	const handleReconnect = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
	}, [queryClient, userId])

	useEffect(() => {
		// Skip if disabled or no workspaces
		if (!enabled || workspaceIds.length === 0) {
			return
		}

		// Clear any existing subscriptions
		channelsRef.current.forEach((channel) => {
			supabase.removeChannel(channel)
		})
		channelsRef.current.clear()

		// Create a channel for each workspace using the broadcast pattern
		workspaceIds.forEach((workspaceId) => {
			const channel = supabase
				.channel(CHANNEL_PATTERNS.workspace(workspaceId))
				.on('broadcast', { event: 'workspace_event' }, handleWorkspaceEvent(workspaceId))
				.subscribe()

			channelsRef.current.set(workspaceId, channel)
		})

		isSubscribedRef.current = true

		// Handle tab visibility changes for reconnection
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && isSubscribedRef.current) {
				handleReconnect()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		// Cleanup on unmount or when dependencies change
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)

			channelsRef.current.forEach((channel) => {
				supabase.removeChannel(channel)
			})
			channelsRef.current.clear()
			isSubscribedRef.current = false
		}
	}, [workspaceIds, enabled, handleWorkspaceEvent, handleReconnect])

	return {
		isSubscribed: isSubscribedRef.current,
		subscribedCount: channelsRef.current.size,
	}
}
