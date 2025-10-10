// Search API Route
// GET /api/search - Search documents across user's workspaces

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

interface SearchResultItem {
	id: string
	type: 'document' | 'folder'
	name: string
	workspaceName: string
	workspaceId: string
	folderId?: string | null
}

interface DocumentWithWorkspace {
	id: string
	name: string
	workspace_id: string
	folder_id: string | null
	workspaces: {
		id: string
		name: string
	}
}

interface FolderWithWorkspace {
	id: string
	name: string
	workspace_id: string
	workspaces: {
		id: string
		name: string
	}
}

/**
 * GET /api/search
 * Search documents and folders across accessible workspaces
 * Query params:
 *   - q: search query (required)
 *   - context: 'all' | 'recent' (default: 'all')
 *   - workspace_id: filter to specific workspace (optional)
 *   - limit: max results (default: 20, max: 50)
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('q')
		const context = searchParams.get('context') || 'all'
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
			return successResponse<SearchResultItem[]>([])
		}

		const workspaceIds = memberships.map((m) => m.workspace_id)
		const results: SearchResultItem[] = []

		// Search documents
		let docQuery = supabase
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
			docQuery = docQuery.eq('workspace_id', workspaceId)
		}

		// Filter by context
		if (context === 'recent') {
			// Get recent document IDs from document_access_log
			const { data: accessLog } = await supabase
				.from('document_access_log')
				.select('document_id')
				.eq('user_id', user.id)
				.order('accessed_at', { ascending: false })
				.limit(100)

			if (accessLog && accessLog.length > 0) {
				const recentDocIds = accessLog.map((log) => log.document_id)
				docQuery = docQuery.in('id', recentDocIds)
			} else {
				// No recent documents, return empty
				return successResponse<SearchResultItem[]>([])
			}
		}

		docQuery = docQuery.order('updated_at', { ascending: false }).limit(limit)

		const { data: documents, error: docError } = await docQuery

		if (docError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Document search failed')
		}

		// Add documents to results
		if (documents) {
			results.push(
				...documents.map((doc: DocumentWithWorkspace) => ({
					id: doc.id,
					type: 'document' as const,
					name: doc.name,
					workspaceName: doc.workspaces?.name || 'Unknown Workspace',
					workspaceId: doc.workspace_id,
					folderId: doc.folder_id,
				}))
			)
		}

		// Search folders (only if context is 'all')
		if (context === 'all') {
			let folderQuery = supabase
				.from('folders')
				.select(
					`
					*,
					workspaces!inner(id, name, is_deleted)
				`
				)
				.in('workspace_id', workspaceIds)
				.eq('is_deleted', false)
				.eq('workspaces.is_deleted', false)
				.ilike('name', `%${query}%`)

			if (workspaceId) {
				folderQuery = folderQuery.eq('workspace_id', workspaceId)
			}

			folderQuery = folderQuery.order('updated_at', { ascending: false }).limit(limit)

			const { data: folders, error: folderError } = await folderQuery

			if (folderError) {
				throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Folder search failed')
			}

			// Add folders to results
			if (folders) {
				results.push(
					...folders.map((folder: FolderWithWorkspace) => ({
						id: folder.id,
						type: 'folder' as const,
						name: folder.name,
						workspaceName: folder.workspaces?.name || 'Unknown Workspace',
						workspaceId: folder.workspace_id,
					}))
				)
			}
		}

		// Sort all results by name match relevance (case-insensitive)
		const sortedResults = results.sort((a: SearchResultItem, b: SearchResultItem) => {
			const queryLower = query.toLowerCase()
			const aName = a.name.toLowerCase()
			const bName = b.name.toLowerCase()

			// Exact matches first
			if (aName === queryLower && bName !== queryLower) return -1
			if (bName === queryLower && aName !== queryLower) return 1

			// Starts with query next
			const aStarts = aName.startsWith(queryLower)
			const bStarts = bName.startsWith(queryLower)
			if (aStarts && !bStarts) return -1
			if (bStarts && !aStarts) return 1

			// Alphabetical
			return aName.localeCompare(bName)
		})

		return successResponse<SearchResultItem[]>(sortedResults.slice(0, limit))
	} catch (error) {
		return handleApiError(error)
	}
}
