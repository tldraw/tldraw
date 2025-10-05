// Document Duplicate API Route
// POST /api/documents/:documentId/duplicate - Duplicate document (metadata only for M2)

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document } from '@/lib/api/types'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

/**
 * POST /api/documents/:documentId/duplicate
 * Duplicate a document (metadata only in M2 - no canvas content)
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { documentId } = await context.params

		// Get original document
		const { data: original } = await supabase
			.from('documents')
			.select('*, workspaces(is_deleted)')
			.eq('id', documentId)
			.single()

		if (!original || original.workspaces?.is_deleted) {
			throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
		}

		// Check if user is a workspace member
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', original.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Only workspace members can duplicate documents'
			)
		}

		// Check document limit
		const { count } = await supabase
			.from('documents')
			.select('*', { count: 'exact', head: true })
			.eq('workspace_id', original.workspace_id)
			.eq('is_archived', false)

		if (count && count >= 1000) {
			throw new ApiException(
				422,
				ErrorCodes.DOCUMENT_LIMIT_EXCEEDED,
				'Document limit exceeded (1000 per workspace)'
			)
		}

		// Create duplicate document with metadata only
		// M2: No canvas content to copy, just metadata
		const { data: duplicate, error } = await supabase
			.from('documents')
			.insert({
				workspace_id: original.workspace_id,
				folder_id: original.folder_id,
				name: `${original.name} (copy)`,
				created_by: user.id, // New document created by current user
				sharing_mode: 'private', // Duplicates start as private
				// Canvas content (r2_key) not copied in M2
			})
			.select('*, creator:users!created_by(id, display_name, email)')
			.single()

		if (error || !duplicate) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to duplicate document')
		}

		return successResponse<Document>(duplicate, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
