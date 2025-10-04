// Folders API Routes
// GET /api/workspaces/:workspaceId/folders - List workspace folders
// POST /api/workspaces/:workspaceId/folders - Create new folder

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { CreateFolderRequest, Folder } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import type { Tables, TablesInsert } from '@/lib/supabase/types'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ workspaceId: string }>
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
 * GET /api/workspaces/:workspaceId/folders
 * List folders in a workspace
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params

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

		// Get all folders in workspace
		const { data, error } = await supabase
			.from('folders')
			.select('*')
			.eq('workspace_id', workspaceId)
			.order('name', { ascending: true })

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch folders')
		}

		const folders = (data || []) as Tables<'folders'>[]

		return successResponse<Folder[]>(folders)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * POST /api/workspaces/:workspaceId/folders
 * Create a new folder in workspace
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const user = await requireAuth()
		const supabase = await createClient()
		const { workspaceId } = await context.params
		const body: CreateFolderRequest = await request.json()

		if (!body.name || body.name.trim().length === 0) {
			throw new ApiException(400, ErrorCodes.MISSING_REQUIRED_FIELD, 'Folder name is required')
		}

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

		// Verify parent folder if specified
		if (body.parent_folder_id) {
			const { data } = await supabase
				.from('folders')
				.select('workspace_id')
				.eq('id', body.parent_folder_id)
				.single()

			const parentFolder = data as Pick<Tables<'folders'>, 'workspace_id'> | null

			if (!parentFolder) {
				throw new ApiException(404, ErrorCodes.FOLDER_NOT_FOUND, 'Parent folder not found')
			}

			if (parentFolder.workspace_id !== workspaceId) {
				throw new ApiException(
					409,
					ErrorCodes.FOLDER_NOT_IN_WORKSPACE,
					'Parent folder does not belong to this workspace'
				)
			}

			// Check depth limit (10 levels)
			const depth = await getFolderDepth(supabase, body.parent_folder_id, workspaceId)
			if (depth >= 10) {
				throw new ApiException(
					400,
					ErrorCodes.FOLDER_DEPTH_EXCEEDED,
					'Folder depth limit exceeded (max 10 levels)'
				)
			}
		}

		// Create folder
		const insertData: TablesInsert<'folders'> = {
			workspace_id: workspaceId,
			parent_folder_id: body.parent_folder_id || null,
			name: body.name.trim(),
			created_by: user.id,
		}

		const { data, error: folderError } = await supabase
			.from('folders')
			.insert(insertData)
			.select()
			.single()

		if (folderError || !data) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create folder')
		}

		const folder = data as Tables<'folders'>

		return successResponse<Folder>(folder, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
