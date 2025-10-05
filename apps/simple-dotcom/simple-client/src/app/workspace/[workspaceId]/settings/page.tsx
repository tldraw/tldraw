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

	if (!isOwner) {
		// Check membership for read-only access
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('role')
			.eq('workspace_id', workspaceId)
			.eq('user_id', userId)
			.single()

		if (!membership) {
			return null
		}

		return {
			workspace,
			isOwner: false,
			role: membership.role,
		}
	}

	return {
		workspace,
		isOwner: true,
		role: 'owner' as const,
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
		/>
	)
}
