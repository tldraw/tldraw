// Members API Routes
// GET /api/workspaces/:workspaceId/members - List workspace members

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { WorkspaceMember } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * GET /api/workspaces/:workspaceId/members
 * List all members of a workspace
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params

		// Verify user has access to workspace
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this workspace')
		}

		// Get all members with user details
		const { data: members, error } = await supabase
			.from('workspace_members')
			.select(
				`
				*,
				users:user_id (
					id,
					email,
					display_name,
					name
				)
			`
			)
			.eq('workspace_id', workspaceId)
			.order('joined_at', { ascending: true })

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch members')
		}

		// Transform data to match WorkspaceMember type
		const transformedMembers: WorkspaceMember[] =
			members?.map((member: any) => ({
				id: member.id,
				workspace_id: member.workspace_id,
				user_id: member.user_id,
				workspace_role: member.workspace_role,
				joined_at: member.joined_at,
				user: {
					id: member.users.id,
					email: member.users.email,
					display_name: member.users.display_name,
					name: member.users.name,
				},
			})) || []

		return successResponse<WorkspaceMember[]>(transformedMembers)
	} catch (error) {
		return handleApiError(error)
	}
}
