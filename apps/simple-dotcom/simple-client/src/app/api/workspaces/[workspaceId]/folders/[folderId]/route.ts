// Individual Folder API Routes
// GET /api/workspaces/:workspaceId/folders/:folderId - Get folder details
// PATCH /api/workspaces/:workspaceId/folders/:folderId - Update folder (rename or move)
// DELETE /api/workspaces/:workspaceId/folders/:folderId - Delete folder

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Folder, UpdateFolderRequest } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/types'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string; folderId: string }>
}

/**
 * Helper: Calculate folder depth to prevent exceeding max depth (10 levels)
 */
async function getFolderDepth(
	supabase: Awaited<ReturnType<typeof createClient>>,
	folderId: string,
	workspaceId: string
): Promise<number> {
	let depth = 1
	let currentFolderId: string | null = folderId

	while (currentFolderId && depth < 15) {
		// Safety limit
		const { data } = await supabase
			.from('folders')
			.select('parent_folder_id, workspace_id')
			.eq('id', currentFolderId)
			.single()

		const folder = data as Pick<Tables<'folders'>, 'parent_folder_id' | 'workspace_id'> | null

		if (!folder) break
		if (folder.workspace_id !== workspaceId) {
			throw new ApiException(
				409,
				ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
				'Folder hierarchy crosses workspace boundaries'
			)
		}

		if (!folder.parent_folder_id) break
		currentFolderId = folder.parent_folder_id
		depth++
	}

	return depth
}

/**
 * Helper: Check for cycles in folder hierarchy
 */
async function wouldCreateCycle(
	supabase: Awaited<ReturnType<typeof createClient>>,
	folderId: string,
	parentFolderId: string
): Promise<boolean> {
	let currentFolderId: string | null = parentFolderId
	const visited = new Set<string>()

	while (currentFolderId) {
		if (currentFolderId === folderId) return true
		if (visited.has(currentFolderId)) return true // Cycle detected
		visited.add(currentFolderId)

		const { data } = await supabase
			.from('folders')
			.select('parent_folder_id')
			.eq('id', currentFolderId)
			.single()

		const folder = data as Pick<Tables<'folders'>, 'parent_folder_id'> | null

		if (!folder) break
		currentFolderId = folder.parent_folder_id
	}

	return false
}

/**
 * GET /api/workspaces/:workspaceId/folders/:folderId
 * Get folder details
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId, folderId } = await context.params

		// Verify user has access to workspace
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this workspace')
		}

		// Get folder
		const { data, error } = await supabase
			.from('folders')
			.select('*')
			.eq('id', folderId)
			.eq('workspace_id', workspaceId)
			.single()

		if (error || !data) {
			throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Folder not found')
		}

		const folder = data as Tables<'folders'>

		return successResponse<Folder>(folder)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * PATCH /api/workspaces/:workspaceId/folders/:folderId
 * Update folder (rename or move to new parent)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId, folderId } = await context.params
		const body: UpdateFolderRequest = await request.json()

		// Verify user has access to workspace
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this workspace')
		}

		// Get current folder to verify it exists
		const { data: currentFolder, error: fetchError } = await supabase
			.from('folders')
			.select('*')
			.eq('id', folderId)
			.eq('workspace_id', workspaceId)
			.single()

		if (fetchError || !currentFolder) {
			throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Folder not found')
		}

		const folder = currentFolder as Tables<'folders'>

		// Prepare update data
		const updateData: Partial<Tables<'folders'>> = {}

		// Handle rename
		if (body.name !== undefined) {
			if (body.name.trim().length === 0) {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Folder name cannot be empty')
			}
			updateData.name = body.name.trim()
		}

		// Handle parent folder change (move)
		if (body.parent_folder_id !== undefined) {
			// Allow null to move to root
			if (body.parent_folder_id === null) {
				updateData.parent_folder_id = null
			} else {
				const newParentId = body.parent_folder_id

				// Cannot set self as parent
				if (newParentId === folderId) {
					throw new ApiException(
						400,
						ErrorCodes.FOLDER_CYCLE_DETECTED,
						'A folder cannot be its own parent'
					)
				}

				// Verify new parent exists and is in same workspace
				const { data: parentData } = await supabase
					.from('folders')
					.select('workspace_id')
					.eq('id', newParentId)
					.single()

				const parentFolder = parentData as Pick<Tables<'folders'>, 'workspace_id'> | null

				if (!parentFolder) {
					throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Parent folder not found')
				}

				if (parentFolder.workspace_id !== workspaceId) {
					throw new ApiException(
						409,
						ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
						'Cannot move folder to a different workspace'
					)
				}

				// Check for cycles
				const cycleDetected = await wouldCreateCycle(supabase, folderId, newParentId)
				if (cycleDetected) {
					throw new ApiException(
						400,
						ErrorCodes.FOLDER_CYCLE_DETECTED,
						'Moving this folder would create a circular reference'
					)
				}

				// Check depth limit - the new parent's depth + 1 + this folder's subtree depth
				const parentDepth = await getFolderDepth(supabase, newParentId, workspaceId)

				// Get this folder's maximum subtree depth
				const { data: childrenData } = await supabase
					.from('folders')
					.select('id')
					.eq('workspace_id', workspaceId)

				const allFolders = (childrenData || []) as Pick<Tables<'folders'>, 'id'>[]

				// Calculate subtree depth starting from this folder
				let maxSubtreeDepth = 0
				const calculateSubtreeDepth = async (
					parentId: string,
					currentDepth: number
				): Promise<void> => {
					if (currentDepth > maxSubtreeDepth) {
						maxSubtreeDepth = currentDepth
					}

					const { data: children } = await supabase
						.from('folders')
						.select('id')
						.eq('parent_folder_id', parentId)

					const childFolders = (children || []) as Pick<Tables<'folders'>, 'id'>[]

					for (const child of childFolders) {
						await calculateSubtreeDepth(child.id, currentDepth + 1)
					}
				}

				await calculateSubtreeDepth(folderId, 0)

				// New total depth would be parent depth + 1 (this folder) + subtree depth
				const newTotalDepth = parentDepth + 1 + maxSubtreeDepth

				if (newTotalDepth > 10) {
					throw new ApiException(
						400,
						ErrorCodes.FOLDER_DEPTH_EXCEEDED,
						`Moving this folder would exceed maximum depth of 10 levels (would be ${newTotalDepth} levels deep)`
					)
				}

				updateData.parent_folder_id = newParentId
			}
		}

		// Only perform update if there are changes
		if (Object.keys(updateData).length === 0) {
			return successResponse<Folder>(folder)
		}

		// Perform update - database triggers will validate depth and cycles again
		const { data: updatedData, error: updateError } = await supabase
			.from('folders')
			.update(updateData)
			.eq('id', folderId)
			.eq('workspace_id', workspaceId)
			.select()
			.single()

		if (updateError) {
			// Check for specific database errors
			if (updateError.message.includes('Folder depth exceeds maximum')) {
				throw new ApiException(
					400,
					ErrorCodes.FOLDER_DEPTH_EXCEEDED,
					'Folder depth limit exceeded (max 10 levels)'
				)
			}
			if (updateError.message.includes('Folder cycle detected')) {
				throw new ApiException(
					400,
					ErrorCodes.FOLDER_CYCLE_DETECTED,
					'Moving this folder would create a circular reference'
				)
			}
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update folder')
		}

		const updatedFolder = updatedData as Tables<'folders'>

		return successResponse<Folder>(updatedFolder)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * DELETE /api/workspaces/:workspaceId/folders/:folderId
 * Delete folder (cascades to children and sets documents' folder_id to NULL)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId, folderId } = await context.params

		// Verify user has access to workspace
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this workspace')
		}

		// Verify folder exists and belongs to workspace
		const { data: folderData } = await supabase
			.from('folders')
			.select('*')
			.eq('id', folderId)
			.eq('workspace_id', workspaceId)
			.single()

		if (!folderData) {
			throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Folder not found')
		}

		// Delete folder (cascades to children via ON DELETE CASCADE)
		const { error: deleteError } = await supabase
			.from('folders')
			.delete()
			.eq('id', folderId)
			.eq('workspace_id', workspaceId)

		if (deleteError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to delete folder')
		}

		return successResponse({ message: 'Folder deleted successfully' })
	} catch (error) {
		return handleApiError(error)
	}
}
