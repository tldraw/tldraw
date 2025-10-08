// Real-time Broadcast Utilities
// Server-side helpers for broadcasting events to Supabase Realtime channels

import { getLogger } from '@/lib/server/logger'
import { SupabaseClient } from '@supabase/supabase-js'
import { CHANNEL_PATTERNS, createWorkspaceEvent, type WorkspaceEventType } from './types'

/**
 * Broadcast a workspace-level event to all subscribers
 *
 * @param supabase - Admin Supabase client (with service role key)
 * @param workspaceId - The workspace to broadcast to
 * @param eventType - Type of event
 * @param payload - Event payload data
 * @param actorId - User ID who triggered the event
 */
export async function broadcastWorkspaceEvent(
	supabase: SupabaseClient,
	workspaceId: string,
	eventType: WorkspaceEventType,
	payload: any,
	actorId: string
) {
	const logger = getLogger()
	try {
		const event = createWorkspaceEvent(eventType, payload, actorId)
		const channelName = CHANNEL_PATTERNS.workspace(workspaceId)

		logger.info({
			context: 'broadcast_start',
			workspace_id: workspaceId,
			event_type: eventType,
			channel_name: channelName,
			message: 'Starting broadcast',
		})

		const channel = supabase.channel(channelName)

		// Subscribe first to enable WebSocket delivery
		await new Promise<void>((resolve, reject) => {
			channel.subscribe((status) => {
				logger.info({
					context: 'broadcast_subscribe',
					workspace_id: workspaceId,
					status,
					message: 'Channel subscription status',
				})
				if (status === 'SUBSCRIBED') {
					resolve()
				} else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
					reject(new Error(`Channel subscription failed: ${status}`))
				}
			})
		})

		// Send broadcast event via WebSocket
		const sendResult = await channel.send({
			type: 'broadcast',
			event: 'workspace_event',
			payload: event,
		})

		logger.info({
			context: 'broadcast_sent',
			workspace_id: workspaceId,
			event_type: eventType,
			send_result: sendResult,
			message: 'Broadcast sent',
		})

		// Clean up channel
		await supabase.removeChannel(channel)

		return { success: true }
	} catch (error) {
		logger.error({
			context: 'broadcast_error',
			workspace_id: workspaceId,
			event_type: eventType,
			error: error instanceof Error ? error.message : String(error),
			message: 'Failed to broadcast event',
		})
		return { success: false, error }
	}
}

/**
 * Broadcast a document-specific event
 * Note: For MVP, document events are broadcast through workspace channel
 * since documents don't have their own channels (canvas sync uses separate WebSocket)
 *
 * @param supabase - Admin Supabase client
 * @param documentId - The document that changed
 * @param workspaceId - The workspace containing the document
 * @param eventType - Type of event
 * @param payload - Event payload data
 * @param actorId - User ID who triggered the event
 */
export async function broadcastDocumentEvent(
	supabase: SupabaseClient,
	documentId: string,
	workspaceId: string,
	eventType: Extract<WorkspaceEventType, `document.${string}`>,
	payload: any,
	actorId: string
) {
	// For MVP, route through workspace channel
	// Document-specific channels are reserved for canvas sync
	return broadcastWorkspaceEvent(
		supabase,
		workspaceId,
		eventType,
		{ ...payload, documentId },
		actorId
	)
}

/**
 * Broadcast a member change event
 *
 * @param supabase - Admin Supabase client
 * @param workspaceId - The workspace where membership changed
 * @param eventType - Type of member event
 * @param userId - The user whose membership changed
 * @param role - The user's role (if applicable)
 * @param actorId - User ID who triggered the event
 */
export async function broadcastMemberEvent(
	supabase: SupabaseClient,
	workspaceId: string,
	eventType: Extract<WorkspaceEventType, `member.${string}`>,
	userId: string,
	role: 'owner' | 'member' | undefined,
	actorId: string
) {
	const action = eventType.split('.')[1] as 'added' | 'removed' | 'updated'

	return broadcastWorkspaceEvent(
		supabase,
		workspaceId,
		eventType,
		{
			workspaceId,
			userId,
			role,
			action,
		},
		actorId
	)
}

/**
 * Broadcast a folder change event
 *
 * @param supabase - Admin Supabase client
 * @param folderId - The folder that changed
 * @param workspaceId - The workspace containing the folder
 * @param eventType - Type of folder event
 * @param payload - Additional folder data
 * @param actorId - User ID who triggered the event
 */
export async function broadcastFolderEvent(
	supabase: SupabaseClient,
	folderId: string,
	workspaceId: string,
	eventType: Extract<WorkspaceEventType, `folder.${string}`>,
	payload: {
		name?: string
		parentId?: string | null
	},
	actorId: string
) {
	const action = eventType.split('.')[1] as 'created' | 'updated' | 'deleted'

	return broadcastWorkspaceEvent(
		supabase,
		workspaceId,
		eventType,
		{
			folderId,
			workspaceId,
			...payload,
			action,
		},
		actorId
	)
}
