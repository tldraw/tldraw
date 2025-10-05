// Real-time Broadcast Utilities
// Server-side helpers for broadcasting events to Supabase Realtime channels

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
	try {
		const event = createWorkspaceEvent(eventType, payload, actorId)

		const channel = supabase.channel(CHANNEL_PATTERNS.workspace(workspaceId))

		// Send broadcast event
		await channel.send({
			type: 'broadcast',
			event: 'workspace_event',
			payload: event,
		})

		// Clean up channel
		await supabase.removeChannel(channel)

		console.log(`Broadcast ${eventType} event to workspace ${workspaceId}`)
		return { success: true }
	} catch (error) {
		console.error(`Failed to broadcast event to workspace ${workspaceId}:`, error)
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
