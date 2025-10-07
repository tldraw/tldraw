import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkspaceMembersClient from './workspace-members-client'

interface WorkspaceMembersPageProps {
	params: Promise<{ workspaceId: string }>
}

interface Member {
	id: string
	email: string
	display_name: string | null
	role: 'owner' | 'member'
}

async function getWorkspaceMembers(userId: string, workspaceId: string) {
	const supabase = await createClient()

	// Fetch workspace
	const { data: workspace } = await supabase
		.from('workspaces')
		.select('*, owner_id')
		.eq('id', workspaceId)
		.eq('is_deleted', false)
		.single()

	if (!workspace) {
		return null
	}

	// Check if user is owner
	const isOwner = workspace.owner_id === userId

	if (!isOwner) {
		// Non-owners cannot access members page
		return null
	}

	// Fetch owner info
	const { data: ownerData } = await supabase
		.from('users')
		.select('id, email, display_name')
		.eq('id', workspace.owner_id)
		.single()

	// Fetch all members EXCEPT the owner (owner is added separately)
	const { data: membersData } = await supabase
		.from('workspace_members')
		.select(
			`
			user_id,
			role,
			users!inner (
				id,
				email,
				display_name
			)
		`
		)
		.eq('workspace_id', workspaceId)
		.neq('user_id', workspace.owner_id)

	const members: Member[] = []

	// Add owner
	if (ownerData) {
		members.push({
			id: ownerData.id,
			email: ownerData.email,
			display_name: ownerData.display_name,
			role: 'owner',
		})
	}

	// Add other members
	if (membersData) {
		membersData.forEach((item) => {
			members.push({
				id: item.users.id,
				email: item.users.email,
				display_name: item.users.display_name,
				role: item.role,
			})
		})
	}

	// Deduplicate members by ID (safety check to prevent duplicate displays)
	// This handles edge cases where the same user might appear multiple times
	// We keep the first occurrence (which will be the owner with correct role)
	const seenIds = new Set<string>()
	const uniqueMembers = members.filter((member) => {
		if (seenIds.has(member.id)) {
			return false
		}
		seenIds.add(member.id)
		return true
	})

	// Fetch invitation link
	const { data: inviteLink } = await supabase
		.from('invitation_links')
		.select('*')
		.eq('workspace_id', workspaceId)
		.single()

	return {
		workspace,
		members: uniqueMembers,
		inviteLink,
		isOwner,
	}
}

export default async function WorkspaceMembersPage({ params }: WorkspaceMembersPageProps) {
	const { workspaceId } = await params

	// Get session
	const user = await getCurrentUser()

	if (!user) {
		redirect(`/login?redirect=/workspace/${workspaceId}/members`)
	}

	// Get workspace members
	const membersData = await getWorkspaceMembers(user.id, workspaceId)

	if (!membersData) {
		redirect('/403')
	}

	return (
		<WorkspaceMembersClient
			workspace={membersData.workspace}
			members={membersData.members}
			inviteLink={membersData.inviteLink}
			currentUserId={user.id}
		/>
	)
}
