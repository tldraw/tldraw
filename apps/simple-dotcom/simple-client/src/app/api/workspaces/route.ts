// Workspaces API Routes
// GET /api/workspaces - List user's workspaces
// POST /api/workspaces - Create new workspace

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, parsePaginationParams, successResponse } from '@/lib/api/response'
import { CreateWorkspaceRequest, Workspace } from '@/lib/api/types'
import { logger } from '@/lib/server/logger'
import { createAdminClient, createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/workspaces
 * List all workspaces the user has access to (owned + member)
 */
export async function GET(request: NextRequest) {
	try {
		// Get session from Better Auth
		const user = await requireAuth()

		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}

		const supabase = await createClient()
		const { searchParams } = new URL(request.url)
		const { limit, offset } = parsePaginationParams(searchParams)

		// Get workspaces where user is owner or member
		const { data, error } = await supabase
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

		const workspaces = data as unknown as Workspace[]

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
		// Get session from Better Auth
		const user = await requireAuth()

		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}

		// Use admin client to bypass RLS for workspace creation
		const supabaseAdmin = createAdminClient()
		const body: CreateWorkspaceRequest = await request.json()

		if (!body.name || body.name.trim().length === 0) {
			throw new ApiException(400, ErrorCodes.MISSING_REQUIRED_FIELD, 'Workspace name is required')
		}

		// Check for duplicate workspace name within user's workspaces
		const { data: existingWorkspace } = await supabaseAdmin
			.from('workspaces')
			.select('id')
			.eq('owner_id', user.id)
			.eq('name', body.name.trim())
			.eq('is_deleted', false)
			.single()

		if (existingWorkspace) {
			throw new ApiException(
				422,
				ErrorCodes.DUPLICATE_WORKSPACE_NAME,
				'A workspace with this name already exists'
			)
		}

		// Check workspace limit (~100 workspaces per user)
		const { count } = await supabaseAdmin
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
		const { data: workspace, error: workspaceError } = await supabaseAdmin
			.from('workspaces')
			.insert({
				owner_id: user.id,
				name: body.name.trim(),
				is_private: false,
			})
			.select()
			.single()

		if (workspaceError || !workspace) {
			logger.error('Error creating workspace', workspaceError, {
				context: 'workspace_creation',
				route: '/api/workspaces',
				user_id: user.id,
			})
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create workspace')
		}

		// Add owner as member (use upsert to handle duplicates)
		const { error: memberError, data: memberData } = await supabaseAdmin
			.from('workspace_members')
			.upsert(
				{
					workspace_id: workspace.id,
					user_id: user.id,
					role: 'owner',
				},
				{
					onConflict: 'workspace_id,user_id',
				}
			)
			.select()

		if (memberError) {
			logger.error('Error creating workspace member', memberError, {
				context: 'workspace_creation',
				route: '/api/workspaces',
				workspace_id: workspace.id,
				user_id: user.id,
				role: 'owner',
			})
			// Rollback workspace creation
			await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
			throw new ApiException(
				500,
				ErrorCodes.INTERNAL_ERROR,
				`Failed to create workspace member: ${memberError.message}`
			)
		}

		logger.info('Successfully created workspace member', {
			context: 'workspace_creation',
			route: '/api/workspaces',
			workspace_id: workspace.id,
			user_id: user.id,
			member_count: memberData?.length || 1,
		})

		return successResponse<Workspace>(workspace, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
