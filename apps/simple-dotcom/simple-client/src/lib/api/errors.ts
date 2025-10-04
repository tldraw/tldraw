// API Error Handling
// Consistent error codes and error response utilities

export const ErrorCodes = {
	// Authentication & Authorization
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	SESSION_EXPIRED: 'SESSION_EXPIRED',

	// Validation
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	INVALID_INPUT: 'INVALID_INPUT',
	MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

	// Resources
	NOT_FOUND: 'NOT_FOUND',
	ALREADY_EXISTS: 'ALREADY_EXISTS',
	CONFLICT: 'CONFLICT',

	// Workspace
	WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
	WORKSPACE_LIMIT_EXCEEDED: 'WORKSPACE_LIMIT_EXCEEDED',
	WORKSPACE_MEMBER_LIMIT_EXCEEDED: 'WORKSPACE_MEMBER_LIMIT_EXCEEDED',
	WORKSPACE_OWNERSHIP_REQUIRED: 'WORKSPACE_OWNERSHIP_REQUIRED',
	CANNOT_DELETE_PRIVATE_WORKSPACE: 'CANNOT_DELETE_PRIVATE_WORKSPACE',
	CANNOT_LEAVE_OWNED_WORKSPACE: 'CANNOT_LEAVE_OWNED_WORKSPACE',

	// Document
	DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
	DOCUMENT_LIMIT_EXCEEDED: 'DOCUMENT_LIMIT_EXCEEDED',
	DOCUMENT_SIZE_EXCEEDED: 'DOCUMENT_SIZE_EXCEEDED',
	DOCUMENT_CREATOR_REQUIRED: 'DOCUMENT_CREATOR_REQUIRED',

	// Folder
	FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
	FOLDER_DEPTH_EXCEEDED: 'FOLDER_DEPTH_EXCEEDED',
	FOLDER_CYCLE_DETECTED: 'FOLDER_CYCLE_DETECTED',
	FOLDER_NOT_IN_WORKSPACE: 'FOLDER_NOT_IN_WORKSPACE',

	// Invitation
	INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
	INVITATION_DISABLED: 'INVITATION_DISABLED',
	INVITATION_EXPIRED: 'INVITATION_EXPIRED',
	ALREADY_MEMBER: 'ALREADY_MEMBER',

	// Rate Limiting
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

	// Server
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export class ApiException extends Error {
	constructor(
		public statusCode: number,
		public code: ErrorCode,
		message: string,
		public details?: Record<string, unknown>
	) {
		super(message)
		this.name = 'ApiException'
	}

	toJSON() {
		return {
			success: false,
			error: {
				code: this.code,
				message: this.message,
				details: this.details,
			},
		}
	}
}

// Helper functions to create common errors
export const createError = {
	unauthorized: (message = 'Unauthorized') =>
		new ApiException(401, ErrorCodes.UNAUTHORIZED, message),

	forbidden: (message = 'Forbidden') => new ApiException(403, ErrorCodes.FORBIDDEN, message),

	notFound: (resource: string, id?: string) =>
		new ApiException(404, ErrorCodes.NOT_FOUND, `${resource}${id ? ` with id ${id}` : ''} not found`),

	validation: (message: string, details?: Record<string, unknown>) =>
		new ApiException(400, ErrorCodes.VALIDATION_ERROR, message, details),

	conflict: (message: string) => new ApiException(409, ErrorCodes.CONFLICT, message),

	rateLimit: (message = 'Rate limit exceeded') =>
		new ApiException(429, ErrorCodes.RATE_LIMIT_EXCEEDED, message),

	internal: (message = 'Internal server error') =>
		new ApiException(500, ErrorCodes.INTERNAL_ERROR, message),
}

// HTTP status code mapping
export const getStatusCodeForError = (code: ErrorCode): number => {
	const mapping: Record<ErrorCode, number> = {
		// 400 - Bad Request
		[ErrorCodes.VALIDATION_ERROR]: 400,
		[ErrorCodes.INVALID_INPUT]: 400,
		[ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
		[ErrorCodes.FOLDER_CYCLE_DETECTED]: 400,
		[ErrorCodes.FOLDER_DEPTH_EXCEEDED]: 400,

		// 401 - Unauthorized
		[ErrorCodes.UNAUTHORIZED]: 401,
		[ErrorCodes.SESSION_EXPIRED]: 401,

		// 403 - Forbidden
		[ErrorCodes.FORBIDDEN]: 403,
		[ErrorCodes.WORKSPACE_OWNERSHIP_REQUIRED]: 403,
		[ErrorCodes.DOCUMENT_CREATOR_REQUIRED]: 403,
		[ErrorCodes.CANNOT_DELETE_PRIVATE_WORKSPACE]: 403,
		[ErrorCodes.CANNOT_LEAVE_OWNED_WORKSPACE]: 403,

		// 404 - Not Found
		[ErrorCodes.NOT_FOUND]: 404,
		[ErrorCodes.WORKSPACE_NOT_FOUND]: 404,
		[ErrorCodes.DOCUMENT_NOT_FOUND]: 404,
		[ErrorCodes.FOLDER_NOT_FOUND]: 404,
		[ErrorCodes.INVITATION_NOT_FOUND]: 404,

		// 409 - Conflict
		[ErrorCodes.CONFLICT]: 409,
		[ErrorCodes.ALREADY_EXISTS]: 409,
		[ErrorCodes.ALREADY_MEMBER]: 409,
		[ErrorCodes.FOLDER_NOT_IN_WORKSPACE]: 409,

		// 410 - Gone
		[ErrorCodes.INVITATION_DISABLED]: 410,
		[ErrorCodes.INVITATION_EXPIRED]: 410,

		// 422 - Unprocessable Entity
		[ErrorCodes.WORKSPACE_LIMIT_EXCEEDED]: 422,
		[ErrorCodes.WORKSPACE_MEMBER_LIMIT_EXCEEDED]: 422,
		[ErrorCodes.DOCUMENT_LIMIT_EXCEEDED]: 422,
		[ErrorCodes.DOCUMENT_SIZE_EXCEEDED]: 422,

		// 429 - Too Many Requests
		[ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,

		// 500 - Internal Server Error
		[ErrorCodes.INTERNAL_ERROR]: 500,

		// 503 - Service Unavailable
		[ErrorCodes.SERVICE_UNAVAILABLE]: 503,
	}

	return mapping[code] ?? 500
}
