import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkspaceSettingsClient from './workspace-settings-client'

interface WorkspaceSettingsPageProps {
	params: Promise<{ workspaceId: string }>
}

async function getWorkspaceSettings(userId: string, workspaceId: string) {
	const supabase = await createClient()

	// Fetch workspace
	const { data: workspace } = await supabase
		.from('workspaces')
		.select('*')
		.eq('id', workspaceId)
		.eq('is_deleted', false)
		.single()

	if (!workspace) {
		return null
	}

	// Check if user is owner or member
	const isOwner = workspace.owner_id === userId

	// Fetch all members for ownership transfer dropdown
	const { data: members } = await supabase
		.from('workspace_members')
		.select('user_id, role, users!inner(id, email, display_name)')
		.eq('workspace_id', workspaceId)
		.order('role', { ascending: false })
		.order('joined_at', { ascending: true })

	// Transform members data
	const transformedMembers =
		members?.map((m) => ({
			id: m.user_id,
			email: m.users.email,
			display_name: m.users.display_name,
			role: m.role,
		})) || []

	if (!isOwner) {
		// Check membership for read-only access
		const membership = members?.find((m) => m.user_id === userId)

		if (!membership) {
			return null
		}

		return {
			workspace,
			isOwner: false,
			role: membership.role,
			members: transformedMembers,
		}
	}

	return {
		workspace,
		isOwner: true,
		role: 'owner' as const,
		members: transformedMembers,
	}
}

export default async function WorkspaceSettingsPage({ params }: WorkspaceSettingsPageProps) {
	const { workspaceId } = await params

	// Get session
	const user = await getCurrentUser()

	if (!user) {
		redirect(`/login?redirect=/workspace/${workspaceId}/settings`)
	}

	// Get workspace settings
	const workspaceSettings = await getWorkspaceSettings(user.id, workspaceId)

	if (!workspaceSettings) {
		redirect('/403')
	}

	return (
		<WorkspaceSettingsClient
			workspace={workspaceSettings.workspace}
			isOwner={workspaceSettings.isOwner}
			role={workspaceSettings.role}
			userId={user.id}
			members={workspaceSettings.members}
		/>
	)
}
