// Regenerate Invitation Link API Route
// POST /api/workspaces/:workspaceId/invite/regenerate - Regenerate invitation token

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { InvitationLink } from '@/lib/api/types'
import {
	createRateLimitResponse,
	RATE_LIMITS,
	rateLimitByWorkspace,
} from '@/lib/rate-limit/rate-limiter'
import { createAdminClient, createClient, requireAuth } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * Generate a secure random token for invitation links
 */
function generateInviteToken(): string {
	return randomBytes(32).toString('base64url')
}

/**
 * POST /api/workspaces/:workspaceId/invite/regenerate
 * Regenerate invitation token (invalidates old link)
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const { workspaceId } = await context.params

		// Check rate limit for workspace (5 regenerations per hour)
		const rateLimitResult = await rateLimitByWorkspace(workspaceId, RATE_LIMITS.INVITE_REGENERATION)

		if (!rateLimitResult.success) {
			return createRateLimitResponse(rateLimitResult)
		}

		const user = await requireAuth()
		const supabase = await createClient()

		// Use admin client to bypass RLS for invitation link operations
		const adminSupabase = createAdminClient()

		// Verify user is owner
		const { data: workspace } = await supabase
			.from('workspaces')
			.select('owner_id, is_private')
			.eq('id', workspaceId)
			.eq('is_deleted', false)
			.single()

		if (!workspace) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found')
		}

		if (workspace.owner_id !== user.id) {
			throw new ApiException(
				403,
				ErrorCodes.WORKSPACE_OWNERSHIP_REQUIRED,
				'Only workspace owner can regenerate invitation link'
			)
		}

		if (workspace.is_private) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Private workspaces cannot have invitation links'
			)
		}

		// Get the current invitation link (the one not superseded by any other)
		// Using admin client to bypass RLS for reading
		const { data: currentLink, error: fetchError } = await adminSupabase
			.from('invitation_links')
			.select('*')
			.eq('workspace_id', workspaceId)
			.is('superseded_by_token_id', null) // Get links not marked as superseded
			.order('created_at', { ascending: false }) // Get the most recent one
			.limit(1)
			.single()

		if (fetchError || !currentLink) {
			console.error('[REGENERATE] Failed to find current invitation link:', {
				workspaceId,
				fetchError,
				currentLink,
			})
			throw new ApiException(
				500,
				ErrorCodes.INTERNAL_ERROR,
				'Failed to find current invitation link'
			)
		}

		// Generate new token first
		const newToken = generateInviteToken()

		// Step 1: Mark old link as superseded first (to satisfy unique constraint)
		// We set superseded_by_token_id to the current link's ID temporarily
		const { error: updateError } = await adminSupabase
			.from('invitation_links')
			.update({
				superseded_by_token_id: currentLink.id, // Temporarily point to self
				regenerated_at: new Date().toISOString(),
			})
			.eq('id', currentLink.id)

		if (updateError) {
			console.error('[REGENERATE] Failed to mark old link as superseded:', {
				updateError: {
					message: updateError.message,
					code: updateError.code,
					details: updateError.details,
					hint: updateError.hint,
				},
				currentLinkId: currentLink.id,
			})
			throw new ApiException(
				500,
				ErrorCodes.INTERNAL_ERROR,
				'Failed to mark old link as superseded'
			)
		}

		// Step 2: Create new invitation link (now that the unique constraint is satisfied)
		let { data: newLink, error: insertError } = await adminSupabase
			.from('invitation_links')
			.insert({
				workspace_id: workspaceId,
				token: newToken,
				created_by: user.id,
				enabled: currentLink.enabled, // Preserve enabled state
			})
			.select()
			.single()

		// Handle the cached constraint error from pgBouncer
		if (
			insertError &&
			insertError.code === '23505' &&
			insertError.message?.includes('invitation_links_workspace_id_key')
		) {
			console.log('[REGENERATE] Detected cached constraint error, working around it')

			// Instead of deleting, let's create a proper superseded link
			// First, create the new link with a temporary different workspace_id
			const tempWorkspaceId = '00000000-0000-0000-0000-000000000000' // Temporary UUID

			const tempResult = await adminSupabase
				.from('invitation_links')
				.insert({
					workspace_id: tempWorkspaceId, // Temporary to avoid constraint
					token: newToken,
					created_by: user.id,
					enabled: currentLink.enabled,
				})
				.select()
				.single()

			if (tempResult.error || !tempResult.data) {
				// Rollback
				await adminSupabase
					.from('invitation_links')
					.update({
						superseded_by_token_id: null,
						regenerated_at: null,
					})
					.eq('id', currentLink.id)

				console.error('[REGENERATE] Failed to create temp link:', tempResult.error)
				throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create invitation link')
			}

			// Now update the old link to point to the new one
			const { error: updateOldError } = await adminSupabase
				.from('invitation_links')
				.update({
					superseded_by_token_id: tempResult.data.id,
					regenerated_at: new Date().toISOString(),
				})
				.eq('id', currentLink.id)

			if (updateOldError) {
				// Rollback: delete temp link
				await adminSupabase.from('invitation_links').delete().eq('id', tempResult.data.id)
				console.error('[REGENERATE] Failed to update old link:', updateOldError)
				throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update old link')
			}

			// Finally, update the new link with the correct workspace_id
			const { error: updateNewError } = await adminSupabase
				.from('invitation_links')
				.update({
					workspace_id: workspaceId,
				})
				.eq('id', tempResult.data.id)

			if (updateNewError) {
				// Rollback everything
				await adminSupabase.from('invitation_links').delete().eq('id', tempResult.data.id)
				await adminSupabase
					.from('invitation_links')
					.update({
						superseded_by_token_id: null,
						regenerated_at: null,
					})
					.eq('id', currentLink.id)
				console.error('[REGENERATE] Failed to update new link workspace:', updateNewError)
				throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update new link')
			}

			newLink = { ...tempResult.data, workspace_id: workspaceId }
			insertError = null // Clear the error since we handled it
		}

		if (insertError || !newLink) {
			// Rollback: restore the old link
			await adminSupabase
				.from('invitation_links')
				.update({
					superseded_by_token_id: null,
					regenerated_at: null,
				})
				.eq('id', currentLink.id)

			console.error('[REGENERATE] Failed to create new invitation link:', {
				insertError: insertError
					? {
							message: insertError.message,
							code: insertError.code,
							details: insertError.details,
							hint: insertError.hint,
						}
					: 'no error but no data',
				workspaceId,
				userId: user.id,
				currentLinkId: currentLink.id,
			})
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create new invitation link')
		}

		// Step 3: Update the old link to point to the new link (only if we didn't delete it)
		// Check if the old link still exists (it won't if we hit the constraint workaround)
		const { data: oldLinkExists } = await adminSupabase
			.from('invitation_links')
			.select('id')
			.eq('id', currentLink.id)
			.single()

		if (oldLinkExists) {
			const { error: finalUpdateError } = await adminSupabase
				.from('invitation_links')
				.update({
					superseded_by_token_id: newLink.id, // Now point to the actual new link
				})
				.eq('id', currentLink.id)

			if (finalUpdateError) {
				// Rollback: delete the new link and restore the old link
				await adminSupabase.from('invitation_links').delete().eq('id', newLink.id)
				await adminSupabase
					.from('invitation_links')
					.update({
						superseded_by_token_id: null,
						regenerated_at: null,
					})
					.eq('id', currentLink.id)

				console.error('[REGENERATE] Failed to update superseded reference:', {
					finalUpdateError,
					currentLinkId: currentLink.id,
					newLinkId: newLink.id,
				})
				throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update link reference')
			}
		}

		return successResponse<InvitationLink>(newLink)
	} catch (error) {
		return handleApiError(error)
	}
}
