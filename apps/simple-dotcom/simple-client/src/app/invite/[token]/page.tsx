import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteAcceptClient from './invite-accept-client'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

interface InvitePageProps {
	params: Promise<{ token: string }>
}

async function getInviteInfo(token: string, userId: string | null) {
	const supabase = await createClient()

	// Fetch invitation link with workspace info
	const { data: inviteLink, error } = await supabase
		.from('invitation_links')
		.select('*, workspaces!inner(*)')
		.eq('token', token)
		.single()

	// For invalid tokens, don't require authentication
	if (error || !inviteLink) {
		return {
			status: 'invalid' as const,
			message: 'This invitation link is invalid.',
		}
	}

	const workspace = inviteLink.workspaces

	// For deleted workspaces, don't require authentication
	if (workspace.is_deleted) {
		return {
			status: 'invalid' as const,
			message: 'This workspace no longer exists.',
		}
	}

	// For valid workspace context, require authentication before revealing details
	if (!userId) {
		return {
			status: 'requires_auth' as const,
			workspace,
		}
	}

	// From here on, user is authenticated - check other conditions

	// First check link validity (disabled or regenerated links should show error even to members)
	// This allows workspace owners to see when their invite links are broken

	// Check if link is enabled
	if (!inviteLink.enabled) {
		return {
			status: 'disabled' as const,
			message: 'This invitation link has been disabled.',
			workspace,
		}
	}

	// Check if token has been superseded (regenerated)
	if (inviteLink.superseded_by_token_id) {
		return {
			status: 'regenerated' as const,
			message: 'This invitation link has expired. A new link was generated.',
			workspace,
		}
	}

	// After confirming link is valid, check if user is already the owner
	if (workspace.owner_id === userId) {
		return {
			status: 'already_member' as const,
			message: 'You are the owner of this workspace.',
			workspace,
		}
	}

	// Check if user is already a member
	const { data: existingMembership } = await supabase
		.from('workspace_members')
		.select('*')
		.eq('workspace_id', workspace.id)
		.eq('user_id', userId)
		.single()

	if (existingMembership) {
		return {
			status: 'already_member' as const,
			message: 'You are already a member of this workspace.',
			workspace,
		}
	}

	// Check member limit
	const { count } = await supabase
		.from('workspace_members')
		.select('*', { count: 'exact', head: true })
		.eq('workspace_id', inviteLink.workspace_id)

	const memberCount = count || 0

	// Using hardcoded limit for now - should match WORKSPACE_LIMITS.MAX_MEMBERS
	const MAX_MEMBERS = 100

	if (memberCount >= MAX_MEMBERS) {
		return {
			status: 'member_limit' as const,
			message: `This workspace has reached its member limit (${MAX_MEMBERS}).`,
			workspace,
		}
	}

	// Valid invitation
	return {
		status: 'valid' as const,
		workspace,
		inviteLink,
	}
}

export default async function InvitePage({ params }: InvitePageProps) {
	const { token } = await params

	// Get session (optional)
	const user = await getCurrentUser()

	const userId = user?.id || null

	// Get invite info
	const inviteInfo = await getInviteInfo(token, userId)

	// If requires auth, redirect to login with return URL
	if (inviteInfo.status === 'requires_auth') {
		const redirectUrl = encodeURIComponent(`/invite/${token}`)
		redirect(`/login?redirect=${redirectUrl}`)
	}

	// Render the invite page for all other statuses (including already_member)
	// The client component will handle showing appropriate messages and actions
	return (
		<InviteAcceptClient
			status={inviteInfo.status}
			workspace={inviteInfo.workspace || null}
			message={inviteInfo.message || null}
			token={token}
			userId={userId}
		/>
	)
}
