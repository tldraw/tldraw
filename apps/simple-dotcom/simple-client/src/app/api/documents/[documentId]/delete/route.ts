// Document Hard Delete API Route
// DELETE /api/documents/:documentId/delete - Permanently delete a document

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { broadcastDocumentEvent } from '@/lib/realtime/broadcast'
import { createAdminClient, createClient, getCurrentUser } from '@/lib/supabase/server'
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

		// Check if user is workspace owner (either direct owner or member with owner role)
		const { data: workspace } = await supabase
			.from('workspaces')
			.select('owner_id')
			.eq('id', document.workspace_id)
			.single()

		const isDirectOwner = workspace?.owner_id === user.id

		if (!isDirectOwner) {
			// Check for member with owner role
			const { data: membership } = await supabase
				.from('workspace_members')
				.select('role')
				.eq('workspace_id', document.workspace_id)
				.eq('user_id', user.id)
				.maybeSingle()

			if (!membership || membership.role !== 'owner') {
				throw new ApiException(
					403,
					ErrorCodes.FORBIDDEN,
					'Only workspace owners can permanently delete documents'
				)
			}
		}

		// Use admin client for deletion to bypass any potential RLS issues
		// We've already verified permissions above
		const adminClient = createAdminClient()

		// Log the hard delete action before deletion
		await adminClient.from('audit_logs').insert({
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
		const { error: deleteError } = await adminClient.from('documents').delete().eq('id', documentId)

		if (deleteError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to delete document')
		}

		// Broadcast delete event before cleanup
		await broadcastDocumentEvent(
			supabase,
			documentId,
			document.workspace_id,
			'document.deleted',
			{
				documentId,
				workspaceId: document.workspace_id,
				action: 'deleted',
			},
			user.id
		)

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
