// Document Sharing API Route
// PATCH /api/documents/:documentId/share - Update document sharing mode

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document, UpdateSharingRequest } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

/**
 * PATCH /api/documents/:documentId/share
 * Update document sharing mode (workspace members only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { documentId } = await context.params
		const body: UpdateSharingRequest = await request.json()

		if (!body.sharing_mode) {
			throw new ApiException(400, ErrorCodes.MISSING_REQUIRED_FIELD, 'sharing_mode is required')
		}

		// Validate sharing mode
		const validModes = ['private', 'public_read_only', 'public_editable']
		if (!validModes.includes(body.sharing_mode)) {
			throw new ApiException(
				400,
				ErrorCodes.INVALID_INPUT,
				'Invalid sharing mode. Must be one of: private, public_read_only, public_editable'
			)
		}

		// Get document and verify access
		const { data: document } = await supabase
			.from('documents')
			.select('workspace_id')
			.eq('id', documentId)
			.single()

		if (!document) {
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
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Only workspace members can change sharing settings'
			)
		}

		// Update sharing mode
		const { data: updated, error } = await supabase
			.from('documents')
			.update({
				sharing_mode: body.sharing_mode,
				updated_at: new Date().toISOString(),
			})
			.eq('id', documentId)
			.select()
			.single()

		if (error || !updated) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update sharing mode')
		}

		return successResponse<Document>(updated)
	} catch (error) {
		return handleApiError(error)
	}
}
