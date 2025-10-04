// Workspace Detail API Routes
// GET /api/workspaces/:workspaceId - Get workspace details
// PATCH /api/workspaces/:workspaceId - Update workspace
// DELETE /api/workspaces/:workspaceId - Delete workspace (soft delete)

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { UpdateWorkspaceRequest, Workspace } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * GET /api/workspaces/:workspaceId
 * Get workspace details
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

		const { data: workspace, error } = await supabase
			.from('workspaces')
			.select('*')
			.eq('id', workspaceId)
			.eq('is_deleted', false)
			.single()

		if (error || !workspace) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found')
		}

		return successResponse<Workspace>(workspace)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * PATCH /api/workspaces/:workspaceId
 * Update workspace (owner only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params
		const body: UpdateWorkspaceRequest = await request.json()

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
				'Only workspace owner can update workspace'
			)
		}

		// Update workspace
		const updates: Partial<UpdateWorkspaceRequest> & { updated_at: string } = {
			updated_at: new Date().toISOString(),
		}

		if (body.name !== undefined) {
			if (body.name.trim().length === 0) {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Workspace name cannot be empty')
			}
			updates.name = body.name.trim()
		}

		const { data: updated, error } = await supabase
			.from('workspaces')
			.update(updates)
			.eq('id', workspaceId)
			.select()
			.single()

		if (error || !updated) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update workspace')
		}

		return successResponse<Workspace>(updated)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * DELETE /api/workspaces/:workspaceId
 * Soft delete workspace (owner only, cannot delete private workspace)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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
				'Only workspace owner can delete workspace'
			)
		}

		if (workspace.is_private) {
			throw new ApiException(
				403,
				ErrorCodes.CANNOT_DELETE_PRIVATE_WORKSPACE,
				'Cannot delete private workspace'
			)
		}

		// Soft delete
		const { error } = await supabase
			.from('workspaces')
			.update({
				is_deleted: true,
				deleted_at: new Date().toISOString(),
			})
			.eq('id', workspaceId)

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to delete workspace')
		}

		return successResponse({ message: 'Workspace deleted successfully' })
	} catch (error) {
		return handleApiError(error)
	}
}
