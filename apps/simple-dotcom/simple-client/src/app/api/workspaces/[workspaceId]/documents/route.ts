// Documents API Routes
// GET /api/workspaces/:workspaceId/documents - List workspace documents
// POST /api/workspaces/:workspaceId/documents - Create new document

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, parsePaginationParams, successResponse } from '@/lib/api/response'
import { CreateDocumentRequest, Document } from '@/lib/api/types'
import { requireWorkspaceMembership } from '@/lib/api/workspace-middleware'
import { broadcastDocumentEvent } from '@/lib/realtime/broadcast'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * GET /api/workspaces/:workspaceId/documents
 * List documents in a workspace
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params
		const { searchParams } = new URL(request.url)
		const { limit, offset } = parsePaginationParams(searchParams)
		const includeArchived = searchParams.get('archived') === 'true'
		const folderId = searchParams.get('folder_id')

		// Verify user has access to workspace
		await requireWorkspaceMembership(workspaceId, user.id, supabase)

		// Build query
		let query = supabase
			.from('documents')
			.select('*', { count: 'exact' })
			.eq('workspace_id', workspaceId)

		if (!includeArchived) {
			query = query.eq('is_archived', false)
		}

		if (folderId) {
			query = query.eq('folder_id', folderId)
		} else if (searchParams.has('folder_id')) {
			// Explicitly null folder_id
			query = query.is('folder_id', null)
		}

		query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

		const { data: documents, error } = await query

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch documents')
		}

		return successResponse<Document[]>(documents || [])
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * POST /api/workspaces/:workspaceId/documents
 * Create a new document in workspace
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params
		const body: CreateDocumentRequest = await request.json()

		if (!body.name || body.name.trim().length === 0) {
			throw new ApiException(400, ErrorCodes.MISSING_REQUIRED_FIELD, 'Document name is required')
		}

		// Verify user has access to workspace
		await requireWorkspaceMembership(workspaceId, user.id, supabase)

		// Check document limit (~1000 documents per workspace)
		const { count } = await supabase
			.from('documents')
			.select('*', { count: 'exact', head: true })
			.eq('workspace_id', workspaceId)
			.eq('is_archived', false)

		if (count && count >= 1000) {
			throw new ApiException(
				422,
				ErrorCodes.DOCUMENT_LIMIT_EXCEEDED,
				'Document limit exceeded (1000 per workspace)'
			)
		}

		// Verify folder exists and belongs to workspace if specified
		if (body.folder_id) {
			const { data: folder } = await supabase
				.from('folders')
				.select('workspace_id')
				.eq('id', body.folder_id)
				.single()

			if (!folder) {
				throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Folder not found')
			}

			if (folder.workspace_id !== workspaceId) {
				throw new ApiException(
					409,
					ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
					'Folder does not belong to this workspace'
				)
			}
		}

		// Create document
		const { data: document, error: documentError } = await supabase
			.from('documents')
			.insert({
				workspace_id: workspaceId,
				folder_id: body.folder_id || null,
				name: body.name.trim(),
				created_by: user.id,
				sharing_mode: 'private',
			})
			.select()
			.single()

		if (documentError || !document) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create document')
		}

		// Broadcast document creation event to workspace subscribers
		await broadcastDocumentEvent(
			supabase,
			document.id,
			workspaceId,
			'document.created',
			{
				documentId: document.id,
				workspaceId,
				name: document.name,
				folderId: document.folder_id,
				action: 'created',
			},
			user.id
		)

		return successResponse<Document>(document, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
