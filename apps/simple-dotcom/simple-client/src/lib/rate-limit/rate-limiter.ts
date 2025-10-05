/**
 * Simple in-memory rate limiter for MVP
 * Can be replaced with Redis/Cloudflare KV for production scaling
 */

import { NextRequest } from 'next/server'

interface RateLimitConfig {
	windowMs: number // Time window in milliseconds
	maxRequests: number // Max requests per window
	keyPrefix?: string // Optional prefix for the key
}

interface RateLimitResult {
	success: boolean
	limit: number
	remaining: number
	resetTime: number
}

// In-memory store (will reset on server restart - okay for MVP)
// In production, replace with Redis or Cloudflare KV
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
	const now = Date.now()
	for (const [key, value] of rateLimitStore.entries()) {
		if (value.resetTime < now) {
			rateLimitStore.delete(key)
		}
	}
}, 60000) // Clean every minute

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
	// Try various headers that might contain the real IP
	const forwardedFor = request.headers.get('x-forwarded-for')
	if (forwardedFor) {
		return forwardedFor.split(',')[0].trim()
	}

	const realIp = request.headers.get('x-real-ip')
	if (realIp) {
		return realIp
	}

	// Fallback to a default (shouldn't happen in production with proper proxy setup)
	return '127.0.0.1'
}

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(
	key: string,
	config: RateLimitConfig
): Promise<RateLimitResult> {
	const now = Date.now()
	const resetTime = now + config.windowMs
	const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key

	// Get or create entry
	let entry = rateLimitStore.get(fullKey)

	// If entry doesn't exist or has expired, create new one
	if (!entry || entry.resetTime < now) {
		entry = {
			count: 0,
			resetTime: resetTime,
		}
		rateLimitStore.set(fullKey, entry)
	}

	// Increment counter
	entry.count++

	// Check if limit exceeded
	const success = entry.count <= config.maxRequests
	const remaining = Math.max(0, config.maxRequests - entry.count)

	return {
		success,
		limit: config.maxRequests,
		remaining,
		resetTime: entry.resetTime,
	}
}

/**
 * Rate limit by IP address
 */
export async function rateLimitByIp(
	request: NextRequest,
	config: RateLimitConfig
): Promise<RateLimitResult> {
	const ip = getClientIp(request)
	return checkRateLimit(ip, config)
}

/**
 * Rate limit by workspace ID
 */
export async function rateLimitByWorkspace(
	workspaceId: string,
	config: RateLimitConfig
): Promise<RateLimitResult> {
	return checkRateLimit(workspaceId, { ...config, keyPrefix: 'workspace' })
}

/**
 * Rate limit by user ID
 */
export async function rateLimitByUser(
	userId: string,
	config: RateLimitConfig
): Promise<RateLimitResult> {
	return checkRateLimit(userId, { ...config, keyPrefix: 'user' })
}

/**
 * Create rate limit error response with proper headers
 */
export function createRateLimitResponse(result: RateLimitResult) {
	const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000)

	return new Response(
		JSON.stringify({
			error: 'Too many requests',
			message: 'You have exceeded the rate limit. Please try again later.',
			retryAfter: retryAfterSeconds,
		}),
		{
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'X-RateLimit-Limit': result.limit.toString(),
				'X-RateLimit-Remaining': result.remaining.toString(),
				'X-RateLimit-Reset': result.resetTime.toString(),
				'Retry-After': retryAfterSeconds.toString(),
			},
		}
	)
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
	// Auth endpoints: 10 requests per 15 minutes
	AUTH: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 10,
	},

	// Invitation validation: 20 requests per 5 minutes per IP
	INVITE_VALIDATION: {
		windowMs: 5 * 60 * 1000, // 5 minutes
		maxRequests: 20,
	},

	// Invitation regeneration: 5 per hour per workspace
	INVITE_REGENERATION: {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxRequests: 5,
	},

	// Password reset (for future use)
	PASSWORD_RESET: {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxRequests: 3,
	},

	// General API (relaxed for MVP, can be tightened later)
	GENERAL_API: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 100,
	},
}

// Development mode overrides (more relaxed limits)
if (process.env.NODE_ENV === 'development') {
	RATE_LIMITS.AUTH.maxRequests = 100
	RATE_LIMITS.INVITE_VALIDATION.maxRequests = 100
	RATE_LIMITS.INVITE_REGENERATION.maxRequests = 50
	RATE_LIMITS.GENERAL_API.maxRequests = 1000
}
