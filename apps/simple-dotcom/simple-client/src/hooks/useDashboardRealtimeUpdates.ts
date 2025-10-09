'use client'

// useDashboardRealtimeUpdates Hook
// Subscribes to workspace-level broadcast events across all workspaces the user has access to

import { CHANNEL_PATTERNS } from '@/lib/realtime/types'
import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useRef } from 'react'

interface UseDashboardRealtimeUpdatesOptions {
	onChange?: () => void
	enabled?: boolean
}

/**
 * Hook to subscribe to workspace-level broadcast events for dashboard
 *
 * Listens to workspace.created, workspace.updated, workspace.archived events
 * across all workspaces the user is a member of.
 *
 * Note: We subscribe to a user-specific channel to catch all workspace events.
 * The server broadcasts to individual workspace channels, but we also need
 * to listen for new workspace creation events.
 *
 * @param userId - The user ID to subscribe to
 * @param workspaceIds - List of workspace IDs to subscribe to
 * @param options - onChange callback and configuration
 */
export function useDashboardRealtimeUpdates(
	userId: string | null | undefined,
	workspaceIds: string[],
	options: UseDashboardRealtimeUpdatesOptions = {}
): void {
	const { onChange, enabled = true } = options

	const channelsRef = useRef<RealtimeChannel[]>([])
	const onChangeRef = useRef(onChange)
	const supabase = getBrowserClient()

	// Keep onChangeRef current without triggering re-subscriptions
	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	useEffect(() => {
		// Skip if no user ID or disabled
		if (!userId || !enabled) {
			return
		}

		// Determine which channels need to be added/removed
		const currentWorkspaceIds = new Set(
			channelsRef.current.map((ch) =>
				ch.topic.replace('realtime:workspace:', '').replace(':workspace_event', '')
			)
		)
		const newWorkspaceIds = new Set(workspaceIds)

		// Remove channels for workspaces no longer in the list
		const channelsToRemove = channelsRef.current.filter((channel) => {
			const workspaceId = channel.topic
				.replace('realtime:workspace:', '')
				.replace(':workspace_event', '')
			return !newWorkspaceIds.has(workspaceId)
		})

		channelsToRemove.forEach((channel) => {
			supabase.removeChannel(channel)
		})

		// Keep channels that are still valid
		channelsRef.current = channelsRef.current.filter((channel) => {
			const workspaceId = channel.topic
				.replace('realtime:workspace:', '')
				.replace(':workspace_event', '')
			return newWorkspaceIds.has(workspaceId)
		})

		// Add channels for new workspaces
		const workspaceIdsToAdd = workspaceIds.filter((id) => !currentWorkspaceIds.has(id))
		const newChannels = workspaceIdsToAdd.map((workspaceId) => {
			const channelName = CHANNEL_PATTERNS.workspace(workspaceId)

			return supabase
				.channel(channelName)
				.on('broadcast', { event: 'workspace_event' }, (payload) => {
					// Trigger refetch on any workspace event
					onChangeRef.current?.()
				})
				.subscribe()
		})

		channelsRef.current = [...channelsRef.current, ...newChannels]

		// Cleanup on unmount only
		return () => {
			channelsRef.current.forEach((channel) => {
				supabase.removeChannel(channel)
			})
			channelsRef.current = []
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, enabled, workspaceIds.join(',')])
}
