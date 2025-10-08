// Join Workspace by Invitation API Route
// POST /api/invite/:token/join - Join workspace using invitation token

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { WORKSPACE_LIMITS } from '@/lib/constants'
import { createRateLimitResponse, RATE_LIMITS, rateLimitByIp } from '@/lib/rate-limit/rate-limiter'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ token: string }>
}

/**
 * POST /api/invite/:token/join
 * Join a workspace using invitation token (requires authentication)
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		// Check rate limit by IP (use same limit as validation)
		const rateLimitResult = await rateLimitByIp(request, RATE_LIMITS.INVITE_VALIDATION)

		if (!rateLimitResult.success) {
			return createRateLimitResponse(rateLimitResult)
		}

		const user = await requireAuth()
		const supabase = await createClient()
		const { token } = await context.params

		// Find invitation by token
		const { data: invitation } = await supabase
			.from('invitation_links')
			.select('*, workspaces(name, is_deleted)')
			.eq('token', token)
			.single()

		if (!invitation) {
			throw new ApiException(404, ErrorCodes.INVITATION_NOT_FOUND, 'Invitation not found')
		}

		if (!invitation.enabled) {
			throw new ApiException(
				410,
				ErrorCodes.INVITATION_DISABLED,
				'This invitation link is disabled'
			)
		}

		if (invitation.workspaces?.is_deleted) {
			throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Workspace no longer exists')
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

		// Check if already a member
		const { data: existingMembership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', invitation.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (existingMembership) {
			throw new ApiException(
				409,
				ErrorCodes.ALREADY_MEMBER,
				'You are already a member of this workspace'
			)
		}

		// Check member limit
		const { count } = await supabase
			.from('workspace_members')
			.select('*', { count: 'exact', head: true })
			.eq('workspace_id', invitation.workspace_id)

		const memberCount = count || 0

		if (memberCount >= WORKSPACE_LIMITS.MAX_MEMBERS) {
			// Log the blocked attempt
			await supabase.from('audit_logs').insert({
				user_id: user.id,
				workspace_id: invitation.workspace_id,
				action: 'member_limit_exceeded',
				metadata: {
					attempted_action: 'join_workspace_by_invitation',
					current_count: memberCount,
					limit: WORKSPACE_LIMITS.MAX_MEMBERS,
				},
			})

			throw new ApiException(
				422,
				ErrorCodes.WORKSPACE_MEMBER_LIMIT_EXCEEDED,
				`Workspace has reached the maximum limit of ${WORKSPACE_LIMITS.MAX_MEMBERS} members`
			)
		}

		// Add member
		const { error } = await supabase.from('workspace_members').insert({
			workspace_id: invitation.workspace_id,
			user_id: user.id,
			role: 'member',
		})

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to join workspace')
		}

		// Check if approaching limit and include warning
		const warning =
			memberCount >= WORKSPACE_LIMITS.WARNING_THRESHOLD
				? `This workspace is approaching its member limit (${memberCount + 1}/${
						WORKSPACE_LIMITS.MAX_MEMBERS
					})`
				: undefined

		return successResponse({
			message: 'Successfully joined workspace',
			workspace_id: invitation.workspace_id,
			workspace_name: invitation.workspaces?.name,
			warning,
			member_count: memberCount + 1,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
