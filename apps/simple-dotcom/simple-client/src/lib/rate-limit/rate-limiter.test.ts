/**
 * Tests for rate limiting functionality
 */

import { describe, expect, it, vi } from 'vitest'
import { checkRateLimit, RATE_LIMITS, rateLimitByIp } from './rate-limiter'

describe('Rate Limiter', () => {
	it('should allow requests within the limit', async () => {
		const key = 'test-key-1'
		const config = { windowMs: 60000, maxRequests: 3 }

		// First request should succeed
		const result1 = await checkRateLimit(key, config)
		expect(result1.success).toBe(true)
		expect(result1.remaining).toBe(2)

		// Second request should succeed
		const result2 = await checkRateLimit(key, config)
		expect(result2.success).toBe(true)
		expect(result2.remaining).toBe(1)

		// Third request should succeed
		const result3 = await checkRateLimit(key, config)
		expect(result3.success).toBe(true)
		expect(result3.remaining).toBe(0)
	})

	it('should block requests exceeding the limit', async () => {
		const key = 'test-key-2'
		const config = { windowMs: 60000, maxRequests: 2 }

		// First two requests should succeed
		await checkRateLimit(key, config)
		await checkRateLimit(key, config)

		// Third request should fail
		const result = await checkRateLimit(key, config)
		expect(result.success).toBe(false)
		expect(result.remaining).toBe(0)
	})

	it('should reset after the time window expires', async () => {
		const key = 'test-key-3'
		const config = { windowMs: 100, maxRequests: 1 } // 100ms window

		// First request should succeed
		const result1 = await checkRateLimit(key, config)
		expect(result1.success).toBe(true)

		// Second request should fail
		const result2 = await checkRateLimit(key, config)
		expect(result2.success).toBe(false)

		// Wait for window to expire
		await new Promise((resolve) => setTimeout(resolve, 150))

		// Third request should succeed (new window)
		const result3 = await checkRateLimit(key, config)
		expect(result3.success).toBe(true)
	})

	it('should track different keys separately', async () => {
		const config = { windowMs: 60000, maxRequests: 1 }

		// Request with key1 should succeed
		const result1 = await checkRateLimit('key1', config)
		expect(result1.success).toBe(true)

		// Request with key2 should also succeed
		const result2 = await checkRateLimit('key2', config)
		expect(result2.success).toBe(true)

		// Second request with key1 should fail
		const result3 = await checkRateLimit('key1', config)
		expect(result3.success).toBe(false)

		// Second request with key2 should fail
		const result4 = await checkRateLimit('key2', config)
		expect(result4.success).toBe(false)
	})

	it('should extract IP from request headers', async () => {
		// Mock request with x-forwarded-for header
		const mockRequest = {
			headers: {
				get: vi.fn((name) => {
					if (name === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1'
					return null
				}),
			},
		} as any

		const result = await rateLimitByIp(mockRequest, {
			windowMs: 60000,
			maxRequests: 5,
		})

		expect(result.success).toBe(true)
		expect(mockRequest.headers.get).toHaveBeenCalledWith('x-forwarded-for')
	})

	it('should use correct rate limits for different endpoints', () => {
		// Auth endpoint should have 10 requests per 15 minutes
		expect(RATE_LIMITS.AUTH.maxRequests).toBe(process.env.NODE_ENV === 'development' ? 100 : 10)
		expect(RATE_LIMITS.AUTH.windowMs).toBe(15 * 60 * 1000)

		// Invite validation should have 20 requests per 5 minutes
		expect(RATE_LIMITS.INVITE_VALIDATION.maxRequests).toBe(
			process.env.NODE_ENV === 'development' ? 100 : 20
		)
		expect(RATE_LIMITS.INVITE_VALIDATION.windowMs).toBe(5 * 60 * 1000)

		// Invite regeneration should have 5 requests per hour
		expect(RATE_LIMITS.INVITE_REGENERATION.maxRequests).toBe(
			process.env.NODE_ENV === 'development' ? 50 : 5
		)
		expect(RATE_LIMITS.INVITE_REGENERATION.windowMs).toBe(60 * 60 * 1000)
	})
})
