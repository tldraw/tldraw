// Document Archive API Route
// POST /api/documents/:documentId/archive - Archive (soft delete) a document

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

/**
 * POST /api/documents/:documentId/archive
 * Archive a document (soft delete) - workspace members only
 */
export async function POST(_request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { documentId } = await context.params

		// Get document and check if user is workspace member
		const { data: document } = await supabase
			.from('documents')
			.select('*, workspaces(is_deleted)')
			.eq('id', documentId)
			.single()

		if (!document || document.workspaces?.is_deleted) {
			throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
		}

		// Check workspace membership
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
				'Only workspace members can archive documents'
			)
		}

		// Check if already archived
		if (document.is_archived) {
			throw new ApiException(409, ErrorCodes.CONFLICT, 'Document is already archived')
		}

		// Archive the document
		const { error: archiveError } = await supabase
			.from('documents')
			.update({
				is_archived: true,
				archived_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', documentId)

		if (archiveError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to archive document')
		}

		// Log the archive action
		await supabase.from('audit_logs').insert({
			user_id: user.id,
			workspace_id: document.workspace_id,
			document_id: documentId,
			action: 'document_archived',
			metadata: { document_name: document.name },
		})

		return successResponse({
			message: 'Document archived successfully',
			documentId: documentId,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
