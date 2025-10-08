// Members API Routes
// GET /api/workspaces/:workspaceId/members - List workspace members

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { requireWorkspaceMembership } from '@/lib/api/workspace-middleware'
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

		// Verify user has access to workspace and get workspace details
		const { data: workspace } = await supabase
			.from('workspaces')
			.select('*, owner_id')
			.eq('id', workspaceId)
			.eq('is_deleted', false)
			.single()

		if (!workspace) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found')
		}

		// Check if user is owner
		const isOwner = workspace.owner_id === user.id

		// Verify user is a member if not owner
		if (!isOwner) {
			await requireWorkspaceMembership(workspaceId, user.id, supabase)
		}

		// Get members with user details
		// Include email only for workspace owners (for member management)
		const selectQuery = isOwner
			? `
				*,
				users:user_id (
					id,
					display_name,
					name,
					email
				)
			`
			: `
				*,
				users:user_id (
					id,
					display_name,
					name
				)
			`

		// Get all members from workspace_members table
		const { data: members, error } = await supabase
			.from('workspace_members')
			.select(selectQuery)
			.eq('workspace_id', workspaceId)
			.order('joined_at', { ascending: true })

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch members')
		}

		// Transform data to match the Member interface used in the client
		// This format is compatible with the workspace members page
		const transformedMembers: any[] =
			members?.map((member: any) => ({
				id: member.user_id,
				email: isOwner ? member.users.email : undefined,
				display_name: member.users.display_name,
				name: member.users.name,
				role: member.workspace_role,
			})) || []

		return successResponse(transformedMembers)
	} catch (error) {
		return handleApiError(error)
	}
}
