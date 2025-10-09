// Document Move API Route
// PATCH /api/documents/:documentId/move - Move document to folder

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document } from '@/lib/api/types'
import { broadcastDocumentEvent } from '@/lib/realtime/broadcast'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

interface MoveDocumentRequest {
	folder_id: string | null // null = move to workspace root
}

/**
 * PATCH /api/documents/:documentId/move
 * Move document to a different folder or workspace root
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { documentId } = await context.params
		const body: MoveDocumentRequest = await request.json()

		// Get document and verify access
		const { data: document } = await supabase
			.from('documents')
			.select('*, workspaces(is_deleted)')
			.eq('id', documentId)
			.single()

		if (!document || document.workspaces?.is_deleted) {
			throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
		}

		// Verify user is workspace member
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', document.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Only workspace members can move documents')
		}

		// Check if document is archived (can't move archived documents)
		if (document.is_archived) {
			throw new ApiException(409, ErrorCodes.CONFLICT, 'Cannot move archived document')
		}

		// Validate folder if not null
		if (body.folder_id !== null) {
			const { data: folder } = await supabase
				.from('folders')
				.select('workspace_id')
				.eq('id', body.folder_id)
				.single()

			if (!folder) {
				throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Folder not found')
			}

			if (folder.workspace_id !== document.workspace_id) {
				throw new ApiException(
					409,
					ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
					'Folder does not belong to this workspace'
				)
			}
		}

		// Check if already in target location (no-op)
		if (document.folder_id === body.folder_id) {
			return successResponse<Document>(document)
		}

		// Move document
		const { data: updated, error } = await supabase
			.from('documents')
			.update({
				folder_id: body.folder_id,
				updated_at: new Date().toISOString(),
			})
			.eq('id', documentId)
			.select()
			.single()

		if (error || !updated) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to move document')
		}

		// Broadcast move event
		await broadcastDocumentEvent(
			supabase,
			documentId,
			document.workspace_id,
			'document.moved',
			{
				documentId,
				workspaceId: document.workspace_id,
				name: updated.name,
				folderId: updated.folder_id,
				previousFolderId: document.folder_id,
			},
			user.id
		)

		return successResponse<Document>(updated)
	} catch (error) {
		return handleApiError(error)
	}
}
