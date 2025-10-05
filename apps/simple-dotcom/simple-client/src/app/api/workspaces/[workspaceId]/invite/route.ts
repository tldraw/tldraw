// Invitation Link API Routes
// GET /api/workspaces/:workspaceId/invite - Get current invitation link
// PATCH /api/workspaces/:workspaceId/invite - Enable/disable invitation link

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { InvitationLink, UpdateInvitationRequest } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * GET /api/workspaces/:workspaceId/invite
 * Get invitation link for workspace (owner only)
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params

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
				'Only workspace owner can view invitation link'
			)
		}

		if (workspace.is_private) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Private workspaces cannot have invitation links'
			)
		}

		// Get invitation link
		const { data: invitation, error: fetchError } = await supabase
			.from('invitation_links')
			.select('*')
			.eq('workspace_id', workspaceId)
			.single()

		if (fetchError || !invitation) {
			throw new ApiException(
				404,
				ErrorCodes.INVITATION_NOT_FOUND,
				'Invitation link not found for this workspace'
			)
		}

		return successResponse<InvitationLink>(invitation)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * PATCH /api/workspaces/:workspaceId/invite
 * Update invitation link settings (owner only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params
		const body: UpdateInvitationRequest = await request.json()

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
				'Only workspace owner can update invitation link'
			)
		}

		if (workspace.is_private) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Private workspaces cannot have invitation links'
			)
		}

		// Update invitation link
		const { data: updated, error } = await supabase
			.from('invitation_links')
			.update({
				enabled: body.enabled,
			})
			.eq('workspace_id', workspaceId)
			.select()
			.single()

		if (error || !updated) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update invitation link')
		}

		return successResponse<InvitationLink>(updated)
	} catch (error) {
		return handleApiError(error)
	}
}
