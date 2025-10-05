// Document Restore API Route
// POST /api/documents/:documentId/restore - Restore archived document

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document } from '@/lib/api/types'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

/**
 * POST /api/documents/:documentId/restore
 * Restore an archived document
 */
export async function POST(_request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { documentId } = await context.params

		// Get document
		const { data: document } = await supabase
			.from('documents')
			.select('*, workspaces(is_deleted)')
			.eq('id', documentId)
			.single()

		if (!document || document.workspaces?.is_deleted) {
			throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
		}

		// Check if user is a workspace member
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', document.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Only workspace members can restore documents'
			)
		}

		// Check if document is actually archived
		if (!document.is_archived) {
			throw new ApiException(409, ErrorCodes.CONFLICT, 'Document is not archived')
		}

		// Restore document
		const { data: restored, error } = await supabase
			.from('documents')
			.update({
				is_archived: false,
				archived_at: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', documentId)
			.select('*, creator:users!created_by(id, display_name, email)')
			.single()

		if (error || !restored) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to restore document')
		}

		return successResponse<Document>(restored)
	} catch (error) {
		return handleApiError(error)
	}
}
