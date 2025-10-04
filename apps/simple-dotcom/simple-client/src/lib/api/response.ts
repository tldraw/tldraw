// API Response Utilities
// Helper functions for creating consistent API responses

import { NextResponse } from 'next/server'
import { ApiResponse, ApiError, PaginatedResponse } from './types'
import { ApiException, getStatusCodeForError } from './errors'

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
	return NextResponse.json(
		{
			success: true,
			data,
		},
		{ status }
	)
}

/**
 * Create an error API response
 */
export function errorResponse(
	error: ApiError,
	status = 500
): NextResponse<ApiResponse<never>> {
	return NextResponse.json(
		{
			success: false,
			error,
		},
		{ status }
	)
}

/**
 * Handle exceptions and convert them to API responses
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
	console.error('API Error:', error)

	// Handle known ApiExceptions
	if (error instanceof ApiException) {
		return NextResponse.json(error.toJSON(), { status: error.statusCode })
	}

	// Handle unknown errors
	return errorResponse(
		{
			code: 'INTERNAL_ERROR',
			message: error instanceof Error ? error.message : 'An unexpected error occurred',
		},
		500
	)
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
	data: T[],
	total: number,
	page: number,
	limit: number
): NextResponse<ApiResponse<PaginatedResponse<T>>> {
	return successResponse({
		data,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	})
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
	body: T,
	requiredFields: (keyof T)[]
): void {
	const missing = requiredFields.filter((field) => !body[field])
	if (missing.length > 0) {
		throw new ApiException(
			400,
			'MISSING_REQUIRED_FIELD',
			`Missing required fields: ${missing.join(', ')}`,
			{ missingFields: missing }
		)
	}
}

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
	page: number
	limit: number
	offset: number
} {
	const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
	const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
	const offset = (page - 1) * limit

	return { page, limit, offset }
}
