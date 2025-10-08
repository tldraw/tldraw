// Document Detail API Routes
// GET /api/documents/:documentId - Get document details
// PATCH /api/documents/:documentId - Update document
// DELETE /api/documents/:documentId - Delete document

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document, UpdateDocumentRequest } from '@/lib/api/types'
import { broadcastDocumentEvent } from '@/lib/realtime/broadcast'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

/**
 * Helper: Check if user can access document
 * Returns document and access level
 */
async function checkDocumentAccess(documentId: string, userId: string | null) {
	const supabase = await createClient()

	const { data: document } = await supabase
		.from('documents')
		.select('*, workspaces(is_deleted), creator:users!created_by(id, display_name, email)')
		.eq('id', documentId)
		.single()

	if (!document || document.workspaces?.is_deleted) {
		throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
	}

	// Check if public
	if (document.sharing_mode !== 'private') {
		return {
			document,
			canRead: true,
			canWrite: document.sharing_mode === 'public_editable' || userId !== null,
			isMember: false,
		}
	}

	// Private document - must be workspace member
	if (!userId) {
		throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this document')
	}

	const { data: membership } = await supabase
		.from('workspace_members')
		.select('*')
		.eq('workspace_id', document.workspace_id)
		.eq('user_id', userId)
		.single()

	if (!membership) {
		throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this document')
	}

	return {
		document,
		canRead: true,
		canWrite: true,
		isMember: true,
	}
}

/**
 * GET /api/documents/:documentId
 * Get document details (supports public sharing)
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		const { documentId } = await context.params

		const { document } = await checkDocumentAccess(documentId, user?.id || null)

		// Log access for recent documents tracking (only for authenticated users)
		if (user) {
			const supabase = await createClient()
			await supabase.from('document_access_log').insert({
				document_id: documentId,
				workspace_id: document.workspace_id,
				user_id: user.id,
			})
		}

		return successResponse<Document>(document)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * PATCH /api/documents/:documentId
 * Update document (members only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { documentId } = await context.params
		const body: UpdateDocumentRequest = await request.json()

		const { document, isMember } = await checkDocumentAccess(documentId, user.id)

		if (!isMember) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Only workspace members can update document'
			)
		}

		// Build updates
		const updates: Partial<UpdateDocumentRequest> & {
			updated_at: string
			archived_at?: string | null
		} = {
			updated_at: new Date().toISOString(),
		}

		if (body.name !== undefined) {
			if (body.name.trim().length === 0) {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Document name cannot be empty')
			}
			updates.name = body.name.trim()
		}

		if (body.folder_id !== undefined) {
			if (body.folder_id) {
				// Verify folder exists and belongs to workspace
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
			updates.folder_id = body.folder_id
		}

		if (body.is_archived !== undefined) {
			updates.is_archived = body.is_archived
			if (body.is_archived) {
				updates.archived_at = new Date().toISOString()
			}
		}

		const { data: updated, error } = await supabase
			.from('documents')
			.update(updates)
			.eq('id', documentId)
			.select()
			.single()

		if (error || !updated) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update document')
		}

		// Broadcast appropriate event based on what changed
		let eventType: 'document.updated' | 'document.archived' | 'document.restored' =
			'document.updated'
		if (body.is_archived !== undefined) {
			eventType = body.is_archived ? 'document.archived' : 'document.restored'
		}

		await broadcastDocumentEvent(
			supabase,
			documentId,
			document.workspace_id,
			eventType,
			{
				documentId,
				workspaceId: document.workspace_id,
				name: updated.name,
				folderId: updated.folder_id,
				isArchived: updated.is_archived,
				action: eventType.split('.')[1] as 'updated' | 'archived' | 'restored',
			},
			user.id
		)

		return successResponse<Document>(updated)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * DELETE /api/documents/:documentId
 * Soft delete (archive) document (members only)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { documentId } = await context.params

		const { document, isMember } = await checkDocumentAccess(documentId, user.id)

		if (!isMember) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'Only workspace members can archive document'
			)
		}

		// Check if already archived
		if (document.is_archived) {
			throw new ApiException(409, ErrorCodes.CONFLICT, 'Document is already archived')
		}

		// Soft delete - archive document
		const { error } = await supabase
			.from('documents')
			.update({
				is_archived: true,
				archived_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', documentId)

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to archive document')
		}

		// Broadcast archive event
		await broadcastDocumentEvent(
			supabase,
			documentId,
			document.workspace_id,
			'document.archived',
			{
				documentId,
				workspaceId: document.workspace_id,
				isArchived: true,
				action: 'archived',
			},
			user.id
		)

		return successResponse({ message: 'Document archived successfully' })
	} catch (error) {
		return handleApiError(error)
	}
}
