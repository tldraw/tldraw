// Workspace Access Control Middleware
// PERM-01: Reusable utilities for validating workspace membership and ownership

import { ApiException, ErrorCodes } from './errors'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export type WorkspaceRole = 'owner' | 'member'

export interface WorkspaceAccessContext {
	workspaceId: string
	userId: string
	role: WorkspaceRole
	workspace: {
		id: string
		name: string
		owner_id: string
		is_private: boolean
		is_deleted: boolean
	}
}

/**
 * Verify user is a member (or owner) of a workspace
 * Throws ApiException if access denied
 */
export async function requireWorkspaceMembership(
	workspaceId: string,
	userId: string,
	supabase?: SupabaseClient<Database>
): Promise<WorkspaceAccessContext> {
	const client = supabase || (await createClient())

	// First check if workspace exists and is not deleted
	const { data: workspace, error: workspaceError } = await client
		.from('workspaces')
		.select('id, name, owner_id, is_private, is_deleted')
		.eq('id', workspaceId)
		.single()

	if (workspaceError || !workspace) {
		throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found')
	}

	if (workspace.is_deleted) {
		throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace has been deleted')
	}

	// Check if user is the owner
	if (workspace.owner_id === userId) {
		return {
			workspaceId,
			userId,
			role: 'owner',
			workspace,
		}
	}

	// Check if user is a member
	const { data: membership, error: memberError } = await client
		.from('workspace_members')
		.select('role')
		.eq('workspace_id', workspaceId)
		.eq('user_id', userId)
		.maybeSingle()

	if (memberError) {
		throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to check workspace membership')
	}

	if (!membership) {
		throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this workspace')
	}

	return {
		workspaceId,
		userId,
		role: membership.role,
		workspace,
	}
}

/**
 * Verify user is the owner of a workspace
 * Throws ApiException if not owner
 */
export async function requireWorkspaceOwnership(
	workspaceId: string,
	userId: string,
	supabase?: SupabaseClient<Database>
): Promise<WorkspaceAccessContext> {
	const context = await requireWorkspaceMembership(workspaceId, userId, supabase)

	if (context.role !== 'owner') {
		throw new ApiException(
			403,
			ErrorCodes.WORKSPACE_OWNERSHIP_REQUIRED,
			'Only workspace owner can perform this action'
		)
	}

	return context
}

/**
 * Check if user has access to a workspace without throwing
 * Returns null if no access
 */
export async function checkWorkspaceAccess(
	workspaceId: string,
	userId: string,
	supabase?: SupabaseClient<Database>
): Promise<WorkspaceAccessContext | null> {
	try {
		return await requireWorkspaceMembership(workspaceId, userId, supabase)
	} catch (error) {
		if (error instanceof ApiException && error.code === ErrorCodes.FORBIDDEN) {
			return null
		}
		throw error
	}
}

/**
 * Check if user is the owner of a workspace without throwing
 * Returns true if owner, false otherwise
 */
export async function isWorkspaceOwner(
	workspaceId: string,
	userId: string,
	supabase?: SupabaseClient<Database>
): Promise<boolean> {
	const context = await checkWorkspaceAccess(workspaceId, userId, supabase)
	return context?.role === 'owner'
}
