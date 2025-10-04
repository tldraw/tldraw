// Invitation Link API Routes
// GET /api/workspaces/:workspaceId/invite - Get current invitation link
// PATCH /api/workspaces/:workspaceId/invite - Enable/disable invitation link

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { InvitationLink, UpdateInvitationRequest } from '@/lib/api/types'
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
			.select('owner_id')
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

		// Get or create invitation link
		let { data: invitation } = await supabase
			.from('invitation_links')
			.select('*')
			.eq('workspace_id', workspaceId)
			.single()

		if (!invitation) {
			// Create initial invitation link
			const { data: newInvitation, error: createError } = await supabase
				.from('invitation_links')
				.insert({
					workspace_id: workspaceId,
					token: generateInviteToken(),
					enabled: false,
					created_by: user.id,
				})
				.select()
				.single()

			if (createError || !newInvitation) {
				throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create invitation link')
			}

			invitation = newInvitation
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
			.select('owner_id')
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
