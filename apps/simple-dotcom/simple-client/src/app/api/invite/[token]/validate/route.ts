// Invite Validation API Route
// GET /api/invite/:token/validate - Validate invitation token and return workspace preview

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { WORKSPACE_LIMITS } from '@/lib/constants'
import { createRateLimitResponse, RATE_LIMITS, rateLimitByIp } from '@/lib/rate-limit/rate-limiter'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ token: string }>
}

/**
 * GET /api/invite/:token/validate
 * Validate invitation token and return workspace preview for unauthenticated users
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		// Check rate limit by IP (20 validations per 5 minutes)
		const rateLimitResult = await rateLimitByIp(request, RATE_LIMITS.INVITE_VALIDATION)

		if (!rateLimitResult.success) {
			return createRateLimitResponse(rateLimitResult)
		}

		const supabase = await createClient()
		const { token } = await context.params
		const user = await getCurrentUser() // Optional - may be null

		// Find invitation by token
		const { data: invitation, error } = await supabase
			.from('invitation_links')
			.select('*, workspaces(id, name, is_deleted)')
			.eq('token', token)
			.single()

		// Check if token exists
		if (error || !invitation) {
			throw new ApiException(
				404,
				ErrorCodes.INVITATION_NOT_FOUND,
				'This invitation link is invalid'
			)
		}

		// Check if workspace exists
		if (invitation.workspaces?.is_deleted) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'This workspace no longer exists')
		}

		// Check if link is disabled
		if (!invitation.enabled) {
			throw new ApiException(
				410,
				ErrorCodes.INVITATION_DISABLED,
				'This invitation link has been disabled'
			)
		}

		// Check if token has been regenerated
		const { data: newerToken } = await supabase
			.from('invitation_links')
			.select('token')
			.eq('workspace_id', invitation.workspace_id)
			.neq('token', token)
			.gt('created_at', invitation.created_at)
			.single()

		if (newerToken) {
			throw new ApiException(
				410,
				ErrorCodes.REGENERATED_TOKEN,
				'This invitation link has expired. A new link was generated.'
			)
		}

		// Check member limit
		const { count } = await supabase
			.from('workspace_members')
			.select('*', { count: 'exact', head: true })
			.eq('workspace_id', invitation.workspace_id)

		const memberCount = count || 0

		if (memberCount >= WORKSPACE_LIMITS.MAX_MEMBERS) {
			throw new ApiException(
				422,
				ErrorCodes.WORKSPACE_MEMBER_LIMIT_EXCEEDED,
				`This workspace has reached its member limit (${WORKSPACE_LIMITS.MAX_MEMBERS})`
			)
		}

		// If user is authenticated, check membership status
		let status: 'valid' | 'requires_auth' | 'already_member' = 'valid'

		if (!user) {
			status = 'requires_auth'
		} else {
			// Check if already a member
			const { data: existingMembership } = await supabase
				.from('workspace_members')
				.select('*')
				.eq('workspace_id', invitation.workspace_id)
				.eq('user_id', user.id)
				.single()

			// Check if owner
			const { data: workspace } = await supabase
				.from('workspaces')
				.select('owner_id')
				.eq('id', invitation.workspace_id)
				.single()

			if (existingMembership || workspace?.owner_id === user.id) {
				status = 'already_member'
			}
		}

		return successResponse({
			workspace: {
				id: invitation.workspaces.id,
				name: invitation.workspaces.name,
			},
			status,
			member_count: memberCount,
			member_limit: WORKSPACE_LIMITS.MAX_MEMBERS,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
