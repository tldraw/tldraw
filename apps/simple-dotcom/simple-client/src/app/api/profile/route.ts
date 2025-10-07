// Profile API Routes
// GET /api/profile - Get current user profile
// PUT /api/profile - Update current user profile

import { ApiException, ErrorCodes } from '@/lib/api/errors'
import { handleApiError, successResponse } from '@/lib/api/response'
import { UpdateProfileRequest, User } from '@/lib/api/types'
import { createClient, requireAuth } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/profile
 * Get the current user's profile
 */
export async function GET() {
	try {
		// Get session from Supabase Auth
		const user = await requireAuth()

		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}

		const supabase = await createClient()

		// Fetch user profile from public.users table
		const { data: profile, error } = await supabase
			.from('users')
			.select('id, email, display_name, name, created_at, updated_at')
			.eq('id', user.id)
			.single()

		if (error || !profile) {
			throw new ApiException(404, ErrorCodes.USER_NOT_FOUND, 'User profile not found')
		}

		return successResponse<User>(profile)
	} catch (error) {
		return handleApiError(error)
	}
}

/**
 * PUT /api/profile
 * Update the current user's profile
 */
export async function PUT(request: NextRequest) {
	try {
		// Get session from Supabase Auth
		const user = await requireAuth()

		if (!user) {
			throw new ApiException(401, ErrorCodes.UNAUTHORIZED, 'Not authenticated')
		}

		const supabase = await createClient()
		const body: UpdateProfileRequest = await request.json()

		// Validate input
		if (body.name !== undefined) {
			if (typeof body.name !== 'string') {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Name must be a string')
			}
			if (body.name.trim().length === 0) {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Name cannot be empty')
			}
			if (body.name.length > 100) {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Name must be 100 characters or less')
			}
		}

		if (body.display_name !== undefined) {
			if (typeof body.display_name !== 'string') {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Display name must be a string')
			}
			if (body.display_name.trim().length === 0) {
				throw new ApiException(400, ErrorCodes.INVALID_INPUT, 'Display name cannot be empty')
			}
			if (body.display_name.length > 100) {
				throw new ApiException(
					400,
					ErrorCodes.INVALID_INPUT,
					'Display name must be 100 characters or less'
				)
			}
		}

		// Build update object with only provided fields
		const updates: Partial<Pick<User, 'name' | 'display_name' | 'updated_at'>> = {
			updated_at: new Date().toISOString(),
		}

		if (body.name !== undefined) {
			updates.name = body.name.trim()
		}

		if (body.display_name !== undefined) {
			updates.display_name = body.display_name.trim()
		}

		// Update user profile
		const { data: profile, error } = await supabase
			.from('users')
			.update(updates)
			.eq('id', user.id)
			.select('id, email, display_name, name, created_at, updated_at')
			.single()

		if (error || !profile) {
			throw new ApiException(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update profile')
		}

		return successResponse<User>(profile)
	} catch (error) {
		return handleApiError(error)
	}
}
