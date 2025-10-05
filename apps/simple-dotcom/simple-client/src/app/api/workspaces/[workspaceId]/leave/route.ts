// Leave Workspace API Route
// POST /api/workspaces/:workspaceId/leave - Leave workspace (members only, owner must transfer first)

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * POST /api/workspaces/:workspaceId/leave
 * Leave a workspace
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}
		const supabase = await createClient()
		const { workspaceId } = await context.params

		// Get workspace to check ownership
		const { data: workspace } = await supabase
			.from('workspaces')
			.select('owner_id, is_private')
			.eq('id', workspaceId)
			.eq('is_deleted', false)
			.single()

		if (!workspace) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found')
		}

		// Cannot leave if you're the owner
		if (workspace.owner_id === user.id) {
			throw new ApiException(
				403,
				ErrorCodes.CANNOT_LEAVE_OWNED_WORKSPACE,
				'Workspace owner must transfer ownership or delete workspace before leaving'
			)
		}

		// Remove membership
		const { error } = await supabase
			.from('workspace_members')
			.delete()
			.eq('workspace_id', workspaceId)
			.eq('user_id', user.id)

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to leave workspace')
		}

		return successResponse({ message: 'Successfully left workspace' })
	} catch (error) {
		return handleApiError(error)
	}
}
