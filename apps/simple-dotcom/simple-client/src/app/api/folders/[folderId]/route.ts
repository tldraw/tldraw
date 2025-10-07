// Individual Folder API Routes
// PATCH /api/folders/:folderId - Update folder (name, parent)
// DELETE /api/folders/:folderId - Delete folder

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { Folder, UpdateFolderRequest } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import type { Tables, TablesUpdate } from '@/lib/supabase/types'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ folderId: string }>
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
 * Returns true if moving folderId under newParentId would create a cycle
 */
async function wouldCreateCycle(
	supabase: Awaited<ReturnType<typeof createClient>>,
	folderId: string,
	newParentId: string
): Promise<boolean> {
	// Cannot be own parent
	if (folderId === newParentId) {
		return true
	}

	let currentFolderId: string | null = newParentId
	const visited = new Set<string>()
	visited.add(folderId) // Add the folder being moved

	while (currentFolderId) {
		if (currentFolderId === folderId) {
			return true // Would create cycle
		}
		if (visited.has(currentFolderId)) {
			return true // Cycle already exists in parent chain
		}
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
 * PATCH /api/folders/:folderId
 * Update folder name or parent (with cycle and depth validation)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { folderId } = await context.params
		const body: UpdateFolderRequest = await request.json()

		// Get existing folder with workspace info
		const { data: existingFolder, error: fetchError } = await supabase
			.from('folders')
			.select('*, workspace:workspaces!inner(*)')
			.eq('id', folderId)
			.single()

		if (fetchError || !existingFolder) {
			throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Folder not found')
		}

		const folder = existingFolder as Tables<'folders'> & {
			workspace: Tables<'workspaces'>
		}

		// Verify user has access to workspace
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', folder.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this workspace')
		}

		const updates: TablesUpdate<'folders'> = {}

		// Update name if provided
		if (body.name !== undefined) {
			if (body.name.trim().length === 0) {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Folder name cannot be empty')
			}
			updates.name = body.name.trim()
		}

		// Update parent if provided
		if (body.parent_folder_id !== undefined) {
			const newParentId = body.parent_folder_id

			// If setting to null (moving to root), that's always allowed
			if (newParentId !== null) {
				// Verify new parent exists and is in same workspace
				const { data: newParent } = await supabase
					.from('folders')
					.select('workspace_id')
					.eq('id', newParentId)
					.single()

				const parentFolder = newParent as Pick<Tables<'folders'>, 'workspace_id'> | null

				if (!parentFolder) {
					throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Parent folder not found')
				}

				if (parentFolder.workspace_id !== folder.workspace_id) {
					throw new ApiException(
						409,
						ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
						'Cannot move folder to a different workspace'
					)
				}

				// Check for cycles
				const hasCycle = await wouldCreateCycle(supabase, folderId, newParentId)
				if (hasCycle) {
					throw new ApiException(
						400,
						ErrorCodes.FOLDER_CYCLE_DETECTED,
						'Moving this folder would create a circular reference. A folder cannot be moved into one of its own subfolders.'
					)
				}

				// Check depth limit after the move
				const newDepth = await getFolderDepth(supabase, newParentId, folder.workspace_id)
				if (newDepth >= 10) {
					throw new ApiException(
						400,
						ErrorCodes.FOLDER_DEPTH_EXCEEDED,
						'Moving this folder would exceed the maximum depth of 10 levels'
					)
				}
			}

			updates.parent_folder_id = newParentId
		}

		// If no updates provided, return existing folder
		if (Object.keys(updates).length === 0) {
			return successResponse<Folder>(folder)
		}

		// Apply updates
		const { data: updatedFolder, error: updateError } = await supabase
			.from('folders')
			.update(updates)
			.eq('id', folderId)
			.select()
			.single()

		if (updateError || !updatedFolder) {
			// Check if database trigger caught validation error
			if (updateError?.message?.includes('cycle')) {
				throw new ApiException(
					400,
					ErrorCodes.FOLDER_CYCLE_DETECTED,
					'Folder cycle detected. This operation would create a circular reference.'
				)
			}
			if (updateError?.message?.includes('depth')) {
				throw new ApiException(
					400,
					ErrorCodes.FOLDER_DEPTH_EXCEEDED,
					'Folder depth limit exceeded (max 10 levels)'
				)
			}
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update folder')
		}

		const result = updatedFolder as Tables<'folders'>

		return successResponse<Folder>(result)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * DELETE /api/folders/:folderId
 * Delete folder (will cascade to subfolders and set documents' folder_id to NULL)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { folderId } = await context.params

		// Get folder with workspace info
		const { data: existingFolder, error: fetchError } = await supabase
			.from('folders')
			.select('*, workspace:workspaces!inner(*)')
			.eq('id', folderId)
			.single()

		if (fetchError || !existingFolder) {
			throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Folder not found')
		}

		const folder = existingFolder as Tables<'folders'> & {
			workspace: Tables<'workspaces'>
		}

		// Verify user has access to workspace
		const { data: membership } = await supabase
			.from('workspace_members')
			.select('*')
			.eq('workspace_id', folder.workspace_id)
			.eq('user_id', user.id)
			.single()

		if (!membership) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this workspace')
		}

		// Delete folder (CASCADE will handle subfolders, documents will have folder_id set to NULL)
		const { error: deleteError } = await supabase.from('folders').delete().eq('id', folderId)

		if (deleteError) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to delete folder')
		}

		return successResponse({ success: true })
	} catch (error) {
		return handleApiError(error)
	}
}
