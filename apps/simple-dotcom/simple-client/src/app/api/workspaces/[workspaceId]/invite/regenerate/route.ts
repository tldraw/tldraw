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
import { createClient, requireAuth } from '@/lib/supabase/server'
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
		const { data: currentLink, error: fetchError } = await supabase
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

		// Create new invitation link
		const { data: newLink, error: insertError } = await supabase
			.from('invitation_links')
			.insert({
				workspace_id: workspaceId,
				token: generateInviteToken(),
				created_by: user.id,
				enabled: currentLink.enabled, // Preserve enabled state
			})
			.select()
			.single()

		if (insertError || !newLink) {
			console.error('[REGENERATE] Failed to create new invitation link:', {
				insertError,
				workspaceId,
				userId: user.id,
				currentLinkId: currentLink.id,
			})
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create new invitation link')
		}

		// Mark old link as superseded
		const { error: updateError } = await supabase
			.from('invitation_links')
			.update({
				superseded_by_token_id: newLink.id,
				regenerated_at: new Date().toISOString(),
			})
			.eq('id', currentLink.id)

		if (updateError) {
			// Rollback by deleting the new link
			await supabase.from('invitation_links').delete().eq('id', newLink.id)
			throw new ApiException(
				500,
				ErrorCodes.INTERNAL_ERROR,
				'Failed to mark old link as superseded'
			)
		}

		return successResponse<InvitationLink>(newLink)
	} catch (error) {
		return handleApiError(error)
	}
}
