// Remove Member API Route
// DELETE /api/workspaces/:workspaceId/members/:userId - Remove member from workspace

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string; userId: string }>
}

/**
 * DELETE /api/workspaces/:workspaceId/members/:userId
 * Remove a member from workspace (owner only)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId, userId } = await context.params

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
				'Only workspace owner can remove members'
			)
		}

		// Cannot remove owner
		if (userId === workspace.owner_id) {
			throw new ApiException(
				400,
				ErrorCodes.INVALID_INPUT,
				'Cannot remove workspace owner. Transfer ownership first.'
			)
		}

		// Remove member
		const { error } = await supabase
			.from('workspace_members')
			.delete()
			.eq('workspace_id', workspaceId)
			.eq('user_id', userId)

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to remove member')
		}

		return successResponse({ message: 'Member removed successfully' })
	} catch (error) {
		return handleApiError(error)
	}
}
