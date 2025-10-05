// Transfer Ownership API Route
// POST /api/workspaces/:workspaceId/transfer-ownership - Transfer workspace ownership

import { ApiException, ErrorCode, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { TransferOwnershipRequest } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
}

/**
 * POST /api/workspaces/:workspaceId/transfer-ownership
 * Transfer workspace ownership to another member
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}
		const supabase = await createClient()
		const { workspaceId } = await context.params
		const body: TransferOwnershipRequest = await request.json()

		if (!body.new_owner_id) {
			throw new ApiException(400, ErrorCodes.MISSING_REQUIRED_FIELD, 'new_owner_id is required')
		}

		// Note: All validation is now handled atomically in the database function
		// This includes checking:
		// - Workspace exists and is not deleted
		// - Current user is the owner
		// - Workspace is not private
		// - New owner is an existing member
		// The function ensures consistency through database-level locks

		// Perform atomic ownership transfer via database function
		// This ensures all updates happen together or none at all
		const { data: result, error } = await supabase.rpc('transfer_workspace_ownership', {
			p_workspace_id: workspaceId,
			p_current_owner_id: user.id,
			p_new_owner_id: body.new_owner_id,
		})

		if (error) {
			throw new ApiException(
				500,
				ErrorCodes.INTERNAL_ERROR,
				`Failed to transfer ownership: ${error.message}`
			)
		}

		// Type guard for the response
		interface TransferResult {
			success: boolean
			error?: string
			code?: string
			message?: string
			data?: {
				workspace_id: string
				previous_owner_id: string
				new_owner_id: string
			}
		}

		const transferResult = result as unknown as TransferResult

		// Handle function response
		if (!transferResult?.success) {
			// Map error codes to appropriate HTTP status and error codes
			const errorCode = transferResult?.code || 'TRANSFER_FAILED'
			const errorMessage = transferResult?.error || 'Failed to transfer ownership'

			let statusCode = 500
			let apiErrorCode: ErrorCode = ErrorCodes.INTERNAL_ERROR

			switch (errorCode) {
				case 'WORKSPACE_NOT_FOUND':
					// This covers both workspace not found and not being the owner
					statusCode = 404
					apiErrorCode = ErrorCodes.WORKSPACE_NOT_FOUND
					// Check if it's actually an ownership issue based on the error message
					if (errorMessage.includes('not the owner')) {
						statusCode = 403
						apiErrorCode = ErrorCodes.WORKSPACE_OWNERSHIP_REQUIRED
					}
					break
				case 'CANNOT_TRANSFER_PRIVATE':
					statusCode = 403
					apiErrorCode = ErrorCodes.CANNOT_DELETE_PRIVATE_WORKSPACE
					break
				case 'INVALID_NEW_OWNER':
					statusCode = 400
					apiErrorCode = ErrorCodes.INVALID_INPUT
					break
				case 'SELF_TRANSFER':
					statusCode = 400
					apiErrorCode = ErrorCodes.INVALID_INPUT
					break
			}

			throw new ApiException(statusCode, apiErrorCode, errorMessage)
		}

		return successResponse({
			message: transferResult.message || 'Ownership transferred successfully',
			data: transferResult.data,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
