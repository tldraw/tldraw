// Search API Route
// GET /api/search - Search documents across user's workspaces

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { SearchResult } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/search
 * Search documents across all accessible workspaces
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('q')
		const workspaceId = searchParams.get('workspace_id')
		const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10))

		if (!query || query.trim().length === 0) {
			throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Search query is required')
		}

		// Get user's workspaces
		const { data: memberships } = await supabase
			.from('workspace_members')
			.select('workspace_id')
			.eq('user_id', user.id)

		if (!memberships || memberships.length === 0) {
			return successResponse<SearchResult[]>([])
		}

		const workspaceIds = memberships.map((m) => m.workspace_id)

		// Build search query
		let searchQuery = supabase
			.from('documents')
			.select(
				`
				*,
				workspaces!inner(id, name, is_deleted)
			`
			)
			.in('workspace_id', workspaceIds)
			.eq('is_archived', false)
			.eq('workspaces.is_deleted', false)
			.ilike('name', `%${query}%`)

		if (workspaceId) {
			searchQuery = searchQuery.eq('workspace_id', workspaceId)
		}

		searchQuery = searchQuery.order('updated_at', { ascending: false }).limit(limit)

		const { data: documents, error } = await searchQuery

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Search failed')
		}

		// Transform results
		const results: SearchResult[] =
			documents?.map((doc: any) => ({
				document: {
					id: doc.id,
					workspace_id: doc.workspace_id,
					folder_id: doc.folder_id,
					name: doc.name,
					created_by: doc.created_by,
					sharing_mode: doc.sharing_mode,
					is_archived: doc.is_archived,
					archived_at: doc.archived_at,
					r2_key: doc.r2_key,
					created_at: doc.created_at,
					updated_at: doc.updated_at,
				},
				workspace: {
					id: doc.workspaces.id,
					name: doc.workspaces.name,
				},
			})) || []

		return successResponse<SearchResult[]>(results)
	} catch (error) {
		return handleApiError(error)
	}
}
