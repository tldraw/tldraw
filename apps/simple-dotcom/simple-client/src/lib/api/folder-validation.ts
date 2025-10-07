// Folder Validation Utilities
// Handles cycle detection, depth validation, and ancestry checks

import { createClient } from '@/lib/supabase/server'
import { ApiException, ErrorCodes } from './errors'
import type { Folder } from './types'

// Maximum allowed folder depth
export const MAX_FOLDER_DEPTH = 10

/**
 * Get all ancestors of a folder up to the root
 */
export async function getFolderAncestors(
	folderId: string,
	workspaceId: string
): Promise<Folder[]> {
	const supabase = await createClient()
	const ancestors: Folder[] = []
	const visited = new Set<string>()
	let currentId: string | null = folderId

	// Walk up the tree collecting ancestors
	while (currentId) {
		// Protect against cycles (shouldn't happen with proper validation)
		if (visited.has(currentId)) {
			throw new ApiException(
				400,
				ErrorCodes.FOLDER_CYCLE_DETECTED,
				'Circular folder reference detected'
			)
		}
		visited.add(currentId)

		const { data, error } = await supabase
			.from('folders')
			.select('*')
			.eq('id', currentId)
			.eq('workspace_id', workspaceId)
			.single()

		if (error || !data) {
			// If we can't find the folder, it might have been deleted
			break
		}

		const folder = data as Folder
		ancestors.push(folder)
		currentId = folder.parent_folder_id
	}

	return ancestors
}

/**
 * Get all descendants of a folder (recursive)
 */
export async function getFolderDescendants(
	folderId: string,
	workspaceId: string
): Promise<Folder[]> {
	const supabase = await createClient()
	const descendants: Folder[] = []
	const queue: string[] = [folderId]
	const visited = new Set<string>()

	while (queue.length > 0) {
		const currentId = queue.shift()!

		// Protect against cycles
		if (visited.has(currentId)) {
			continue
		}
		visited.add(currentId)

		// Get all direct children
		const { data: children, error } = await supabase
			.from('folders')
			.select('*')
			.eq('parent_folder_id', currentId)
			.eq('workspace_id', workspaceId)

		if (!error && children) {
			for (const child of children) {
				descendants.push(child as Folder)
				queue.push(child.id)
			}
		}
	}

	return descendants
}

/**
 * Calculate the depth of a folder in the hierarchy
 * Root folders have depth 0
 */
export async function getFolderDepth(
	folderId: string | null,
	workspaceId: string
): Promise<number> {
	if (!folderId) {
		return 0
	}

	const ancestors = await getFolderAncestors(folderId, workspaceId)
	return ancestors.length
}

/**
 * Validate that a folder move operation won't create cycles or exceed depth limits
 */
export async function validateFolderMove(
	folderId: string,
	newParentId: string | null,
	workspaceId: string
): Promise<void> {
	// Moving to root is always safe
	if (!newParentId) {
		return
	}

	// Can't move a folder to itself
	if (folderId === newParentId) {
		throw new ApiException(
			400,
			ErrorCodes.FOLDER_CYCLE_DETECTED,
			'Cannot move folder into itself'
		)
	}

	// Check if new parent is a descendant of the folder being moved
	// This would create a cycle
	const descendants = await getFolderDescendants(folderId, workspaceId)
	if (descendants.some(d => d.id === newParentId)) {
		throw new ApiException(
			400,
			ErrorCodes.FOLDER_CYCLE_DETECTED,
			'Cannot move folder into one of its descendants'
		)
	}

	// Check depth limit
	// Get the depth of the new parent
	const newParentDepth = await getFolderDepth(newParentId, workspaceId)

	// Get the maximum depth of the folder subtree being moved
	const folderSubtreeDepth = await getMaxSubtreeDepth(folderId, workspaceId)

	// The new total depth would be: parent depth + 1 (for the folder itself) + subtree depth
	const newTotalDepth = newParentDepth + 1 + folderSubtreeDepth

	if (newTotalDepth > MAX_FOLDER_DEPTH) {
		throw new ApiException(
			400,
			ErrorCodes.FOLDER_DEPTH_EXCEEDED,
			`Moving this folder would exceed the maximum depth of ${MAX_FOLDER_DEPTH} levels`
		)
	}
}

/**
 * Get the maximum depth of a folder's subtree
 */
async function getMaxSubtreeDepth(
	folderId: string,
	workspaceId: string
): Promise<number> {
	const supabase = await createClient()
	let maxDepth = 0
	const queue: { id: string; depth: number }[] = [{ id: folderId, depth: 0 }]
	const visited = new Set<string>()

	while (queue.length > 0) {
		const { id: currentId, depth } = queue.shift()!

		if (visited.has(currentId)) {
			continue
		}
		visited.add(currentId)

		// Get all direct children
		const { data: children, error } = await supabase
			.from('folders')
			.select('id')
			.eq('parent_folder_id', currentId)
			.eq('workspace_id', workspaceId)

		if (!error && children && children.length > 0) {
			const childDepth = depth + 1
			maxDepth = Math.max(maxDepth, childDepth)

			for (const child of children) {
				queue.push({ id: child.id, depth: childDepth })
			}
		}
	}

	return maxDepth
}

/**
 * Validate folder creation won't exceed depth limits
 */
export async function validateFolderCreation(
	parentId: string | null,
	workspaceId: string
): Promise<void> {
	if (!parentId) {
		// Creating at root is always allowed
		return
	}

	const parentDepth = await getFolderDepth(parentId, workspaceId)

	// New folder would be at parentDepth + 1
	if (parentDepth + 1 > MAX_FOLDER_DEPTH) {
		throw new ApiException(
			400,
			ErrorCodes.FOLDER_DEPTH_EXCEEDED,
			`Cannot create folder: would exceed maximum depth of ${MAX_FOLDER_DEPTH} levels`
		)
	}
}

/**
 * Check if a folder belongs to a specific workspace
 */
export async function validateFolderInWorkspace(
	folderId: string,
	workspaceId: string
): Promise<void> {
	const supabase = await createClient()

	const { data: folder, error } = await supabase
		.from('folders')
		.select('workspace_id')
		.eq('id', folderId)
		.single()

	if (error || !folder) {
		throw new ApiException(
			404,
			ErrorCodes.FOLDER_NOT_FOUND,
			'Folder not found'
		)
	}

	if (folder.workspace_id !== workspaceId) {
		throw new ApiException(
			409,
			ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
			'Folder does not belong to this workspace'
		)
	}
}

/**
 * Get the full path of folder names from root to the specified folder
 */
export async function getFolderPath(
	folderId: string | null,
	workspaceId: string
): Promise<string[]> {
	if (!folderId) {
		return []
	}

	const ancestors = await getFolderAncestors(folderId, workspaceId)
	// Reverse to get root-to-folder order
	return ancestors.reverse().map(f => f.name)
}