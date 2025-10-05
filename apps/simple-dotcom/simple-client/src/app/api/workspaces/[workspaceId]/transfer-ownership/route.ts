// Transfer Ownership API Route
// POST /api/workspaces/:workspaceId/transfer-ownership - Transfer workspace ownership

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { TransferOwnershipRequest } from '@/lib/api/types'
import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * POST /api/workspaces/:workspaceId/transfer-ownership
 * Transfer workspace ownership to another member
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session?.user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}
		const supabase = await createClient()
		const { workspaceId } = await context.params
		const body: TransferOwnershipRequest = await request.json()

		if (!body.new_owner_id) {
			throw new ApiException(400, ErrorCodes.MISSING_REQUIRED_FIELD, 'new_owner_id is required')
		}

		// Verify user is current owner
		const { data: workspace } = await supabase
			.from('workspaces')
			.select('owner_id, is_private')
			.eq('id', workspaceId)
			.eq('is_deleted', false)
			.single()

		if (!workspace) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace not found')
		}

		if (workspace.owner_id !== session.user.id) {
			throw new ApiException(
				403,
				ErrorCodes.WORKSPACE_OWNERSHIP_REQUIRED,
				'Only workspace owner can transfer ownership'
			)
		}

		if (workspace.is_private) {
			throw new ApiException(
				403,
				ErrorCodes.CANNOT_DELETE_PRIVATE_WORKSPACE,
				'Cannot transfer ownership of private workspace'
			)
		}

		// Verify new owner is a member
		const { data: newOwnerMembership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('user_id', body.new_owner_id)
			.single()

		if (!newOwnerMembership) {
			throw new ApiException(
				400,
				ErrorCodes.INVALID_INPUT,
				'New owner must be an existing workspace member'
			)
		}

		// Perform ownership transfer in transaction
		// 1. Update workspace owner
		const { error: workspaceError } = await supabase
			.from('workspaces')
			.update({
				owner_id: body.new_owner_id,
				updated_at: new Date().toISOString(),
			})
			.eq('id', workspaceId)

		if (workspaceError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to transfer ownership')
		}

		// 2. Update new owner's role to 'owner'
		const { error: newOwnerError } = await supabase
			.from('workspace_members')
			.update({ role: 'owner' })
			.eq('workspace_id', workspaceId)
			.eq('user_id', body.new_owner_id)

		if (newOwnerError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update new owner role')
		}

		// 3. Update old owner's role to 'member'
		const { error: oldOwnerError } = await supabase
			.from('workspace_members')
			.update({ role: 'member' })
			.eq('workspace_id', workspaceId)
			.eq('user_id', session.user.id)

		if (oldOwnerError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update old owner role')
		}

		return successResponse({ message: 'Ownership transferred successfully' })
	} catch (error) {
		return handleApiError(error)
	}
}
