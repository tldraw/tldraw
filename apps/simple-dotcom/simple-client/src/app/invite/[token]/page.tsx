import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteAcceptClient from './invite-accept-client'

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

	if (error || !inviteLink) {
		return {
			status: 'invalid' as const,
			message: 'This invitation link is invalid.',
		}
	}

	const workspace = (inviteLink as any).workspaces

	// Check if workspace is deleted
	if (workspace.is_deleted) {
		return {
			status: 'invalid' as const,
			message: 'This workspace no longer exists.',
		}
	}

	// Check if link is enabled
	if (!(inviteLink as any).enabled) {
		return {
			status: 'disabled' as const,
			message: 'This invitation link has been disabled.',
			workspace,
		}
	}

	// Check if token has been regenerated
	const { data: newerToken } = await supabase
		.from('invitation_links')
		.select('token')
		.eq('workspace_id', inviteLink.workspace_id)
		.neq('token', token)
		.gt('created_at', inviteLink.created_at)
		.single()

	if (newerToken) {
		return {
			status: 'regenerated' as const,
			message: 'This invitation link has expired. A new link was generated.',
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

	// If not authenticated, require login
	if (!userId) {
		return {
			status: 'requires_auth' as const,
			workspace,
		}
	}

	// Check if user is already owner
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
		redirect(`/login?redirect=/invite/${token}`)
	}

	// If already a member, redirect to workspace
	if (inviteInfo.status === 'already_member' && inviteInfo.workspace) {
		redirect(`/workspace/${inviteInfo.workspace.id}`)
	}

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
