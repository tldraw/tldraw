// Document Move API Route
// POST /api/documents/:documentId/move - Move document between folders/workspaces

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Document } from '@/lib/api/types'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

interface MoveDocumentRequest {
	target_workspace_id?: string // Target workspace (optional - for cross-workspace moves)
	target_folder_id?: string | null // Target folder (null for workspace root)
}

/**
 * POST /api/documents/:documentId/move
 * Move document to different folder or workspace
 *
 * Permission rules:
 * - Only document creator can move documents between workspaces
 * - Workspace members can move documents within the same workspace
 * - Must be a member of target workspace
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Authentication required')
		}

		const supabase = await createClient()
		const { documentId } = await context.params
		const body: MoveDocumentRequest = await request.json()

		// Get current document
		const { data: document } = await supabase
			.from('documents')
			.select('*, workspaces!inner(is_deleted)')
			.eq('id', documentId)
			.single()

		if (!document || document.workspaces.is_deleted) {
			throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
		}

		// Check if user is member of source workspace
		const { data: sourceMembership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', document.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (!sourceMembership) {
			throw new ApiException(
				403,
				ErrorCodes.FORBIDDEN,
				'You must be a member of the document workspace'
			)
		}

		// Determine target workspace and folder
		const targetWorkspaceId = body.target_workspace_id || document.workspace_id
		const targetFolderId =
			body.target_folder_id !== undefined ? body.target_folder_id : document.folder_id
		const isCrossWorkspaceMove = targetWorkspaceId !== document.workspace_id

		// Validate cross-workspace move permissions
		if (isCrossWorkspaceMove) {
			// Only document creator can move between workspaces
			if (document.created_by !== user.id) {
				throw new ApiException(
					403,
					ErrorCodes.FORBIDDEN,
					'Only the document creator can move documents between workspaces'
				)
			}

			// Verify target workspace exists and is not deleted
			const { data: targetWorkspace } = await supabase
				.from('workspaces')
				.select('is_deleted')
				.eq('id', targetWorkspaceId)
				.single()

			if (!targetWorkspace || targetWorkspace.is_deleted) {
				throw new ApiException(404, ErrorCodes.WORKSPACE_NOT_FOUND, 'Target workspace not found')
			}

			// Verify user is member of target workspace
			const { data: targetMembership } = await supabase
				.from('workspace_members')
				.select('*')
				.eq('workspace_id', targetWorkspaceId)
				.eq('user_id', user.id)
				.single()

			if (!targetMembership) {
				throw new ApiException(
					403,
					ErrorCodes.FORBIDDEN,
					'You must be a member of the target workspace'
				)
			}
		}

		// Validate target folder (if specified)
		if (targetFolderId) {
			const { data: targetFolder } = await supabase
				.from('folders')
				.select('workspace_id')
				.eq('id', targetFolderId)
				.single()

			if (!targetFolder) {
				throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Target folder not found')
			}

			// Ensure folder belongs to target workspace
			if (targetFolder.workspace_id !== targetWorkspaceId) {
				throw new ApiException(
					409,
					ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
					'Target folder does not belong to target workspace'
				)
			}
		}

		// Check if move is actually changing anything
		if (targetWorkspaceId === document.workspace_id && targetFolderId === document.folder_id) {
			throw new ApiException(
				400,
				ErrorCodes.INVALID_INPUT,
				'Document is already in the specified location'
			)
		}

		// Perform the move atomically
		const { data: updatedDocument, error: updateError } = await supabase
			.from('documents')
			.update({
				workspace_id: targetWorkspaceId,
				folder_id: targetFolderId,
				updated_at: new Date().toISOString(),
			})
			.eq('id', documentId)
			.select()
			.single()

		if (updateError || !updatedDocument) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to move document')
		}

		// Log the move operation in audit logs
		await supabase.from('audit_logs').insert({
			workspace_id: targetWorkspaceId,
			user_id: user.id,
			document_id: documentId,
			action: isCrossWorkspaceMove ? 'document.moved_workspace' : 'document.moved_folder',
			metadata: {
				source_workspace_id: document.workspace_id,
				source_folder_id: document.folder_id,
				target_workspace_id: targetWorkspaceId,
				target_folder_id: targetFolderId,
			},
		})

		return successResponse<Document>(updatedDocument)
	} catch (error) {
		return handleApiError(error)
	}
}
