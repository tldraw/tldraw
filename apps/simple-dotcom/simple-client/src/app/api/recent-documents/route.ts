// Recent Documents API Route
// GET /api/recent-documents - Get user's recently accessed documents

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

export interface RecentDocument {
	id: string
	name: string
	workspace_id: string
	workspace_name: string
	folder_id: string | null
	accessed_at: string
	is_archived: boolean
	sharing_mode: 'private' | 'public_read_only' | 'public_editable'
}

/**
 * GET /api/recent-documents
 * Get the current user's recently accessed documents
 * Query params:
 *   - limit: number of documents to return (default: 10, max: 50)
 */
export async function GET(request: NextRequest) {
	try {
		// Get session from Better Auth
		const session = await auth.api.getSession({
			headers: await headers(),
		})

		if (!session?.user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}

		const supabase = await createClient()

		// Parse query params
		const { searchParams } = new URL(request.url)
		const limitParam = searchParams.get('limit')
		const limit = Math.min(Math.max(1, parseInt(limitParam || '10', 10)), 50)

		// Query recent documents with workspace info, filtering out:
		// - Documents user no longer has access to (no workspace membership)
		// - Documents in deleted workspaces
		// Using a subquery to filter based on workspace membership
		const { data, error } = await supabase
			.from('document_access_log')
			.select(
				`
				document_id,
				accessed_at,
				documents!inner (
					id,
					name,
					workspace_id,
					folder_id,
					is_archived,
					sharing_mode,
					workspaces!inner (
						id,
						name,
						is_deleted
					)
				)
			`
			)
			.eq('user_id', session.user.id)
			.order('accessed_at', { ascending: false })
			.limit(limit)

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch recent documents')
		}

		// Filter and transform results
		// We need to manually filter for workspace membership since Supabase RLS handles this
		const { data: memberships } = await supabase
			.from('workspace_members')
			.select('workspace_id')
			.eq('user_id', session.user.id)

		const memberWorkspaceIds = new Set(memberships?.map((m) => m.workspace_id) || [])

		const recentDocuments: RecentDocument[] = (data || [])
			.filter((entry) => {
				const doc = entry.documents as any
				const workspace = doc.workspaces as any
				// Filter out documents in deleted workspaces or where user is not a member
				return !workspace.is_deleted && memberWorkspaceIds.has(doc.workspace_id)
			})
			.map((entry) => {
				const doc = entry.documents as any
				const workspace = doc.workspaces as any
				return {
					id: doc.id,
					name: doc.name,
					workspace_id: doc.workspace_id,
					workspace_name: workspace.name,
					folder_id: doc.folder_id,
					accessed_at: entry.accessed_at,
					is_archived: doc.is_archived,
					sharing_mode: doc.sharing_mode,
				}
			})
			// Remove duplicates (keep most recent)
			.reduce((acc, doc) => {
				if (!acc.find((d) => d.id === doc.id)) {
					acc.push(doc)
				}
				return acc
			}, [] as RecentDocument[])

		return successResponse<RecentDocument[]>(recentDocuments)
	} catch (error) {
		return handleApiError(error)
	}
}
