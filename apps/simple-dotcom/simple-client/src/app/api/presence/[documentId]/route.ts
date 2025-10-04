// Presence API Routes
// GET /api/presence/:documentId - Get active presence sessions for document
// POST /api/presence/:documentId - Update presence for current user

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { PresenceSession, UpdatePresenceRequest } from '@/lib/api/types'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

type RouteContext = {
	params: Promise<{ documentId: string }>
}

/**
 * Helper: Check if user can access document
 */
async function canAccessDocument(documentId: string, userId: string | null) {
	const supabase = await createClient()

	const { data: document } = await supabase
		.from('documents')
		.select('workspace_id, sharing_mode')
		.eq('id', documentId)
		.single()

	if (!document) {
		throw new ApiException(404, ErrorCodes.DOCUMENT_NOT_FOUND, 'Document not found')
	}

	// Public documents are accessible to all
	if (document.sharing_mode !== 'private') {
		return true
	}

	// Private documents require workspace membership
	if (!userId) {
		return false
	}

	const { data: membership } = await supabase
		.from('workspace_members')
		.select('*')
		.eq('workspace_id', document.workspace_id)
		.eq('user_id', userId)
		.single()

	return !!membership
}

/**
 * GET /api/presence/:documentId
 * Get active presence sessions for a document
 */
export async function GET(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		const supabase = await createClient()
		const { documentId } = await context.params

		// Check access
		const hasAccess = await canAccessDocument(documentId, user?.id || null)
		if (!hasAccess) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this document')
		}

		// Get active presence sessions (last seen within 30 seconds)
		const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()

		const { data: sessions, error } = await supabase
			.from('presence')
			.select('*')
			.eq('document_id', documentId)
			.gte('last_seen_at', thirtySecondsAgo)
			.order('last_seen_at', { ascending: false })

		if (error) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch presence')
		}

		return successResponse<PresenceSession[]>(sessions || [])
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * POST /api/presence/:documentId
 * Update presence for current session
 */
export async function POST(request: NextRequest, context: RouteContext) {
	try {
		const user = await getCurrentUser()
		const supabase = await createClient()
		const { documentId } = await context.params
		const body: UpdatePresenceRequest = await request.json()

		// Check access
		const hasAccess = await canAccessDocument(documentId, user?.id || null)
		if (!hasAccess) {
			throw new ApiException(403, ErrorCodes.FORBIDDEN, 'Access denied to this document')
		}

		// Get or create session ID from request
		const sessionId = request.headers.get('x-session-id') || crypto.randomUUID()

		// Upsert presence
		const { data: session, error } = await supabase
			.from('presence')
			.upsert(
				{
					session_id: sessionId,
					document_id: documentId,
					user_id: user?.id || null,
					display_name: user?.email || 'Guest',
					cursor_position: body.cursor_position || null,
					last_seen_at: new Date().toISOString(),
				},
				{
					onConflict: 'session_id',
				}
			)
			.select()
			.single()

		if (error || !session) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update presence')
		}

		return successResponse<PresenceSession>(session)
	} catch (error) {
		return handleApiError(error)
	}
}
