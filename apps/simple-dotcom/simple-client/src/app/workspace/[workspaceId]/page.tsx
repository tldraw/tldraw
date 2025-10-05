import { Document, Folder, Workspace } from '@/lib/api/types'
import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import WorkspaceBrowserClient from './workspace-browser-client'

interface WorkspacePageProps {
	params: Promise<{ workspaceId: string }>
}

interface WorkspaceData {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
	role: 'owner' | 'member'
	isOwner: boolean
}

async function getWorkspaceData(
	userId: string,
	workspaceId: string
): Promise<WorkspaceData | null> {
	const supabase = await createClient()

	// Fetch workspace
	const { data: workspace, error: workspaceError } = await supabase
		.from('workspaces')
		.select('*')
		.eq('id', workspaceId)
		.eq('is_deleted', false)
		.single()

	if (workspaceError || !workspace) {
		return null
	}

	// Check access
	const isOwner = workspace.owner_id === userId
	let role: 'owner' | 'member' = 'owner'

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

		role = membership.role
	}

	// Fetch documents and folders in parallel
	const [documentsResult, foldersResult] = await Promise.all([
		supabase
			.from('documents')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('is_archived', false)
			.order('created_at', { ascending: false }),

		supabase
			.from('folders')
			.select('*')
			.eq('workspace_id', workspaceId)
			.order('name', { ascending: true }),
	])

	if (documentsResult.error) {
		throw documentsResult.error
	}
	if (foldersResult.error) {
		throw foldersResult.error
	}

	return {
		workspace,
		documents: documentsResult.data || [],
		folders: foldersResult.data || [],
		role,
		isOwner,
	}
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
	const { workspaceId } = await params

	// Get session
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		redirect(`/login?redirect=/workspace/${workspaceId}`)
	}

	// Get workspace data
	const workspaceData = await getWorkspaceData(session.user.id, workspaceId)

	if (!workspaceData) {
		redirect('/403')
	}

	return (
		<WorkspaceBrowserClient
			workspace={workspaceData.workspace}
			documents={workspaceData.documents}
			folders={workspaceData.folders}
			role={workspaceData.role}
			isOwner={workspaceData.isOwner}
			userId={session.user.id}
		/>
	)
}
