'use client'

import { getBrowserClient } from '@/lib/supabase/browser'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/**
 * Hook to sync dashboard with realtime database changes
 * Subscribes to changes in all user's workspaces
 *
 * @param userId - Current user ID
 * @param workspaceIds - Array of workspace IDs the user has access to
 */
export function useDashboardRealtime(userId: string, workspaceIds: string[]) {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (workspaceIds.length === 0) return

		const supabase = getBrowserClient()
		console.log('[Dashboard Realtime] Setting up subscriptions for workspaces:', workspaceIds)

		// Create a channel per workspace (Supabase requires filters for security)
		const channels = workspaceIds.map((workspaceId) => {
			return (
				supabase
					.channel(`dashboard-workspace-${workspaceId}`)
					// Listen for document changes in this workspace
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'documents',
							filter: `workspace_id=eq.${workspaceId}`,
						},
						(payload) => {
							console.log(
								'[Dashboard Realtime] Document change in workspace:',
								workspaceId,
								payload.eventType
							)
							// Invalidate dashboard query to refetch all data
							queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
						}
					)
					// Listen for workspace changes
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'workspaces',
							filter: `id=eq.${workspaceId}`,
						},
						() => {
							console.log('[Dashboard Realtime] Workspace change:', workspaceId)
							queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
						}
					)
					// Listen for folder changes in this workspace
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'folders',
							filter: `workspace_id=eq.${workspaceId}`,
						},
						() => {
							console.log('[Dashboard Realtime] Folder change in workspace:', workspaceId)
							queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
						}
					)
					.subscribe((status, err) => {
						if (status === 'SUBSCRIBED') {
							console.log(`[Dashboard Realtime] Subscribed to workspace ${workspaceId}`)
						} else if (status === 'CHANNEL_ERROR') {
							console.error(
								`[Dashboard Realtime] Subscription error for workspace ${workspaceId}:`,
								err
							)
						}
					})
			)
		})

		// Also listen for document access log changes (for recent documents)
		const accessLogChannel = supabase
			.channel('dashboard-access-log')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'document_access_log',
					filter: `user_id=eq.${userId}`,
				},
				() => {
					console.log('[Dashboard Realtime] Document access log change')
					queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
				}
			)
			.subscribe()

		// Cleanup on unmount
		return () => {
			console.log('[Dashboard Realtime] Cleaning up subscriptions')
			channels.forEach((channel) => supabase.removeChannel(channel))
			supabase.removeChannel(accessLogChannel)
		}
	}, [userId, workspaceIds.join(','), queryClient]) // Recreate when workspace list changes

	return null
}
