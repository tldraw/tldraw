// Dashboard API Route
// GET /api/dashboard - Consolidated dashboard data

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document, Folder, RecentDocument, Workspace } from '@/lib/api/types'
import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export interface DashboardData {
	workspaces: Array<{
		workspace: Workspace
		documents: Document[]
		folders: Folder[]
	}>
	recentDocuments: RecentDocument[]
}

/**
 * GET /api/dashboard
 * Consolidated dashboard data - all workspaces, documents, folders, and recent items
 */
export async function GET() {
	try {
		// Get session from Better Auth
		const session = await auth.api.getSession({
			headers: await headers(),
		})

		if (!session?.user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}

		const user = session.user
		const supabase = await createClient()

		// Fetch all accessible workspaces
		// First get workspaces owned by user
		const { data: ownedWorkspaces } = await supabase
			.from('workspaces')
			.select('*')
			.eq('owner_id', user.id)
			.eq('is_deleted', false)

		// Then get workspaces where user is a member
		const { data: memberWorkspaces } = await supabase
			.from('workspace_members')
			.select('workspace:workspaces!inner(*)')
			.eq('user_id', user.id)
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
				.limit(1000), // Reasonable limit per workspace

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
				.eq('user_id', user.id)
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

		const dashboardData: DashboardData = {
			workspaces: workspaceData,
			recentDocuments,
		}

		return successResponse<DashboardData>(dashboardData)
	} catch (error) {
		return handleApiError(error)
	}
}
