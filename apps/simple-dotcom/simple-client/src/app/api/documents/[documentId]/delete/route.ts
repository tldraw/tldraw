// Document Hard Delete API Route
// DELETE /api/documents/:documentId/delete - Permanently delete a document

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

/**
 * DELETE /api/documents/:documentId/delete
 * Permanently delete a document - workspace owners only
 * Requires confirmation header: X-Confirm-Delete: true
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		// Check for confirmation header
		const confirmHeader = request.headers.get('X-Confirm-Delete')
		if (confirmHeader !== 'true') {
			throw new ApiException(
				400,
				ErrorCodes.INVALID_INPUT,
				'Confirmation header X-Confirm-Delete: true is required for hard delete'
			)
		}

		const supabase = await createClient()
		const { documentId } = await context.params

		// Get document and check if user is workspace owner
		const { data: document } = await supabase
			.from('documents')
			.select('*, workspaces(is_deleted)')
			.eq('id', documentId)
			.single()

		if (!document || document.workspaces?.is_deleted) {
			throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
		}

		// Check if user is workspace owner
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('role')
			.eq('workspace_id', document.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (!membership || membership.role !== 'owner') {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Only workspace owners can permanently delete documents'
			)
		}

		// Log the hard delete action before deletion
		await supabase.from('audit_logs').insert({
			user_id: user.id,
			workspace_id: document.workspace_id,
			document_id: documentId,
			action: 'document_hard_deleted',
			metadata: {
				document_name: document.name,
				r2_key: document.r2_key,
			},
		})

		// Permanently delete the document (cascades will handle related records)
		const { error: deleteError } = await supabase.from('documents').delete().eq('id', documentId)

		if (deleteError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to delete document')
		}

		// TODO: Implement R2 storage cleanup when TECH-02 is complete
		// if (document.r2_key) {
		//   await deleteFromR2(document.r2_key)
		// }

		return successResponse({
			message: 'Document permanently deleted',
			documentId: documentId,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
