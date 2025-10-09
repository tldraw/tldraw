'use client'

// useWorkspaceRealtimeUpdates Hook
// Subscribes to real-time Postgres changes for workspace-related tables

import { getBrowserClient } from '@/lib/supabase/browser'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useRef } from 'react'

interface UseWorkspaceRealtimeUpdatesOptions {
	onChange?: () => void
	enabled?: boolean
}

/**
 * Hook to subscribe to real-time Postgres changes for a workspace
 *
 * Listens to INSERT, UPDATE, DELETE events on documents, folders, and workspace_members tables.
 * Filters events to only those relevant to the specified workspace.
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

		// Create channel and subscribe to postgres changes
		const channel = supabase
			.channel(`workspace:${workspaceId}:postgres_changes`)
			// Listen to all document changes in this workspace
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'documents',
					filter: `workspace_id=eq.${workspaceId}`,
				},
				() => {
					onChangeRef.current?.()
				}
			)
			// Listen to all folder changes in this workspace
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'folders',
					filter: `workspace_id=eq.${workspaceId}`,
				},
				() => {
					onChangeRef.current?.()
				}
			)
			// Listen to workspace member changes
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'workspace_members',
					filter: `workspace_id=eq.${workspaceId}`,
				},
				() => {
					onChangeRef.current?.()
				}
			)
			.subscribe()

		// Trigger initial fetch of folders, documents, and workspace members
		onChangeRef.current?.()

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
