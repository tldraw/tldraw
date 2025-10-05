import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'

interface WorkspaceLayoutProps {
	children: ReactNode
	params: Promise<{ workspaceId: string }>
}

async function checkWorkspaceAccess(userId: string, workspaceId: string) {
	const supabase = await createClient()

	// Check if user is owner
	const { data: workspace } = await supabase
		.from('workspaces')
		.select('*, owner_id')
		.eq('id', workspaceId)
		.eq('is_deleted', false)
		.single()

	if (!workspace) {
		return null
	}

	// Check if user is owner or member
	const isOwner = workspace.owner_id === userId

	if (!isOwner) {
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
			role: membership.role,
			isOwner: false,
		}
	}

	return {
		workspace,
		role: 'owner' as const,
		isOwner: true,
	}
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
	const { workspaceId } = await params

	// Get session from Better Auth (server-side)
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	// Redirect to login if not authenticated
	if (!session?.user) {
		redirect(`/login?redirect=/workspace/${workspaceId}`)
	}

	// Check workspace access
	const access = await checkWorkspaceAccess(session.user.id, workspaceId)

	if (!access) {
		redirect('/403')
	}

	// Pass workspace data to children via context or props as needed
	return <div className="workspace-layout">{children}</div>
}
