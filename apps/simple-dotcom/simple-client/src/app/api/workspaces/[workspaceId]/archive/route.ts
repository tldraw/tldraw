// Workspace Archive List API Route
// GET /api/workspaces/:workspaceId/archive - List archived documents

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document } from '@/lib/api/types'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * GET /api/workspaces/:workspaceId/archive
 * List all archived documents in a workspace
 */
export async function GET(_request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { workspaceId } = await context.params

		// Verify workspace exists and is not deleted
		const { data: workspace } = await supabase
			.from('workspaces')
			.select('*, owner_id')
			.eq('id', workspaceId)
			.eq('is_deleted', false)
			.single()

		if (!workspace) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found')
		}

		// Check if user is owner or member
		const isOwner = workspace.owner_id === user.id

		if (!isOwner) {
			const { data: membership } = await supabase
				.from('workspace_members')
				.select('role')
				.eq('workspace_id', workspaceId)
				.eq('user_id', user.id)
				.single()

			if (!membership) {
				throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Only workspace members can view archive')
			}
		}

		// Fetch archived documents
		const { data: archivedDocuments, error } = await supabase
			.from('documents')
			.select('*, creator:users!created_by(id, display_name, email)')
			.eq('workspace_id', workspaceId)
			.eq('is_archived', true)
			.order('updated_at', { ascending: false })

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch archived documents')
		}

		return successResponse<Document[]>(archivedDocuments || [])
	} catch (error) {
		return handleApiError(error)
	}
}
