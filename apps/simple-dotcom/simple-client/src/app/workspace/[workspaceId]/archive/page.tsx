import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkspaceArchiveClient from './workspace-archive-client'

interface WorkspaceArchivePageProps {
	params: Promise<{ workspaceId: string }>
}

async function getArchivedDocuments(userId: string, workspaceId: string) {
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

	// Check access
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
	}

	// Fetch archived documents
	const { data: archivedDocuments, error } = await supabase
		.from('documents')
		.select('*')
		.eq('workspace_id', workspaceId)
		.eq('is_archived', true)
		.order('updated_at', { ascending: false })

	if (error) {
		throw error
	}

	return {
		workspace,
		archivedDocuments: archivedDocuments || [],
		isOwner,
	}
}

export default async function WorkspaceArchivePage({ params }: WorkspaceArchivePageProps) {
	const { workspaceId } = await params

	// Get session
	const user = await getCurrentUser()

	if (!user) {
		redirect(`/login?redirect=/workspace/${workspaceId}/archive`)
	}

	// Get archived documents
	const archiveData = await getArchivedDocuments(user.id, workspaceId)

	if (!archiveData) {
		redirect('/403')
	}

	return (
		<WorkspaceArchiveClient
			workspace={archiveData.workspace}
			archivedDocuments={archiveData.archivedDocuments}
			isOwner={archiveData.isOwner}
		/>
	)
}
