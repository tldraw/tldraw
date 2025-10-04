// Workspaces API Routes
// GET /api/workspaces - List user's workspaces
// POST /api/workspaces - Create new workspace

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, parsePaginationParams, successResponse } from '@/lib/api/response'
import { CreateWorkspaceRequest, Workspace } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/workspaces
 * List all workspaces the user has access to (owned + member)
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { searchParams } = new URL(request.url)
		const { limit, offset } = parsePaginationParams(searchParams)

		// Get workspaces where user is owner or member
		const { data: workspaces, error } = await supabase
			.from('workspaces')
			.select(
				`
				*,
				workspace_members!inner(user_id)
			`,
				{ count: 'exact' }
			)
			.eq('workspace_members.user_id', user.id)
			.eq('is_deleted', false)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1)

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch workspaces')
		}

		return successResponse<Workspace[]>(workspaces || [])
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * POST /api/workspaces
 * Create a new shared workspace
 */
export async function POST(request: NextRequest) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const body: CreateWorkspaceRequest = await request.json()

		if (!body.name || body.name.trim().length === 0) {
			throw new ApiException(400, ErrorCodes.MISSING_REQUIRED_FIELD, 'Workspace name is required')
		}

		// Check workspace limit (~100 workspaces per user)
		const { count } = await supabase
			.from('workspaces')
			.select('*', { count: 'exact', head: true })
			.eq('owner_id', user.id)
			.eq('is_deleted', false)

		if (count && count >= 100) {
			throw new ApiException(
				422,
				ErrorCodes.WORKSPACE_LIMIT_EXCEEDED,
				'Workspace limit exceeded (100 per user)'
			)
		}

		// Create workspace
		const { data: workspace, error: workspaceError } = await supabase
			.from('workspaces')
			.insert({
				owner_id: user.id,
				name: body.name.trim(),
				is_private: false,
			})
			.select()
			.single()

		if (workspaceError || !workspace) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create workspace')
		}

		// Add owner as member
		const { error: memberError } = await supabase.from('workspace_members').insert({
			workspace_id: workspace.id,
			user_id: user.id,
			workspace_role: 'owner',
		})

		if (memberError) {
			// Rollback workspace creation
			await supabase.from('workspaces').delete().eq('id', workspace.id)
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create workspace member')
		}

		return successResponse<Workspace>(workspace, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
