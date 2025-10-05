import { Document, Folder, RecentDocument, Workspace } from '@/lib/api/types'
import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

interface WorkspaceWithContent {
	workspace: Workspace
	documents: Document[]
	folders: Folder[]
}

interface DashboardData {
	workspaces: WorkspaceWithContent[]
	recentDocuments: RecentDocument[]
}

async function getDashboardData(userId: string): Promise<DashboardData> {
	const supabase = await createClient()

	// Fetch all accessible workspaces
	// First get workspaces owned by user
	const { data: ownedWorkspaces } = await supabase
		.from('workspaces')
		.select('*')
		.eq('owner_id', userId)
		.eq('is_deleted', false)

	// Then get workspaces where user is a member
	const { data: memberWorkspaces } = await supabase
		.from('workspace_members')
		.select('workspace:workspaces!inner(*)')
		.eq('user_id', userId)
		.eq('workspace.is_deleted', false)

	// Combine and deduplicate
	const workspaceMap = new Map()

	// Add owned workspaces
	if (ownedWorkspaces) {
		ownedWorkspaces.forEach((ws) => workspaceMap.set(ws.id, ws))
	}

	// Add member workspaces
	if (memberWorkspaces) {
		memberWorkspaces.forEach((item: any) => {
			if (item.workspace) {
				workspaceMap.set(item.workspace.id, item.workspace)
			}
		})
	}

	// Convert to array and sort by created_at
	const workspaces = Array.from(workspaceMap.values()).sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	)

	const workspacesError = null

	if (workspacesError) {
		throw workspacesError
	}

	// Fetch documents and folders for all workspaces in parallel
	const workspaceIds = (workspaces || []).map((ws) => ws.id)

	const [documentsResult, foldersResult, recentResult] = await Promise.all([
		// Get all non-archived documents
		supabase
			.from('documents')
			.select('*')
			.in('workspace_id', workspaceIds)
			.eq('is_archived', false)
			.order('created_at', { ascending: false })
			.limit(1000),

		// Get all folders
		supabase
			.from('folders')
			.select('*')
			.in('workspace_id', workspaceIds)
			.order('name', { ascending: true })
			.limit(1000),

		// Get recent documents (last 20)
		supabase
			.from('document_access_log')
			.select(
				`
				accessed_at,
				document:documents!inner(
					id,
					workspace_id,
					folder_id,
					name,
					created_by,
					sharing_mode,
					is_archived,
					archived_at,
					r2_key,
					created_at,
					updated_at
				),
				workspace:workspaces!inner(
					id,
					name
				)
			`
			)
			.eq('user_id', userId)
			.eq('document.is_archived', false)
			.order('accessed_at', { ascending: false })
			.limit(20),
	])

	if (documentsResult.error) {
		throw documentsResult.error
	}
	if (foldersResult.error) {
		throw foldersResult.error
	}
	if (recentResult.error) {
		throw recentResult.error
	}

	const documents = documentsResult.data || []
	const folders = foldersResult.data || []

	// Group documents and folders by workspace
	const workspaceData = (workspaces || []).map((workspace) => ({
		workspace,
		documents: documents.filter((doc) => doc.workspace_id === workspace.id),
		folders: folders.filter((folder) => folder.workspace_id === workspace.id),
	}))

	// Transform recent documents
	const recentDocuments: RecentDocument[] = (recentResult.data || []).map((log: any) => ({
		document: log.document,
		last_accessed_at: log.accessed_at,
		workspace: log.workspace,
	}))

	return {
		workspaces: workspaceData,
		recentDocuments,
	}
}

async function getUserProfile(userId: string) {
	const supabase = await createClient()

	const { data: profile } = await supabase
		.from('users')
		.select('id, email, display_name, name, created_at, updated_at')
		.eq('id', userId)
		.single()

	return profile
}

export default async function DashboardPage() {
	// Get session from Better Auth (server-side)
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	// Redirect to login if not authenticated
	if (!session?.user) {
		redirect('/login')
	}

	// Fetch dashboard data and user profile in parallel
	const [dashboardData, userProfile] = await Promise.all([
		getDashboardData(session.user.id),
		getUserProfile(session.user.id),
	])

	return (
		<DashboardClient
			initialData={dashboardData}
			userProfile={userProfile}
			userId={session.user.id}
		/>
	)
}
