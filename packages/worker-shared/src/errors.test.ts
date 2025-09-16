import { describe, expect, it } from 'vitest'
import { forbidden, notFound } from './errors'

describe('errors', () => {
	describe('notFound', () => {
		it('returns a Response object with 404 status', () => {
			const response = notFound()

			expect(response).toBeInstanceOf(Response)
			expect(response.status).toBe(404)
		})

		it('returns JSON response with error message', async () => {
			const response = notFound()
			const body = (await response.json()) as { error: string }

			expect(body).toEqual({ error: 'Not found' })
		})

		it('has correct content type header', () => {
			const response = notFound()
			const contentType = response.headers.get('content-type')

			expect(contentType).toBe('application/json')
		})

		it('creates new response instance on each call', () => {
			const response1 = notFound()
			const response2 = notFound()

			expect(response1).not.toBe(response2)
		})

		it('response body is correctly formatted JSON string', async () => {
			const response = notFound()
			const text = await response.text()

			expect(text).toBe('{"error":"Not found"}')
		})

		it('response is not ok status', () => {
			const response = notFound()

			expect(response.ok).toBe(false)
		})

		it('response status text matches standard HTTP 404', () => {
			const response = notFound()

			// Status text might be empty in test environment
			expect(response.statusText).toMatch(/^(|Not Found)$/)
		})

		it('response body can be read multiple times through clone', async () => {
			const response = notFound()
			const clonedResponse = response.clone()

			const body1 = (await response.json()) as { error: string }
			const body2 = (await clonedResponse.json()) as { error: string }

			expect(body1).toEqual(body2)
			expect(body1).toEqual({ error: 'Not found' })
		})
	})

	describe('forbidden', () => {
		it('returns a Response object with 403 status', () => {
			const response = forbidden()

			expect(response).toBeInstanceOf(Response)
			expect(response.status).toBe(403)
		})

		it('returns JSON response with error message', async () => {
			const response = forbidden()
			const body = (await response.json()) as { error: string }

			expect(body).toEqual({ error: 'Forbidden' })
		})

		it('has correct content type header', () => {
			const response = forbidden()
			const contentType = response.headers.get('content-type')

			expect(contentType).toBe('application/json')
		})

		it('creates new response instance on each call', () => {
			const response1 = forbidden()
			const response2 = forbidden()

			expect(response1).not.toBe(response2)
		})

		it('response body is correctly formatted JSON string', async () => {
			const response = forbidden()
			const text = await response.text()

			expect(text).toBe('{"error":"Forbidden"}')
		})

		it('response is not ok status', () => {
			const response = forbidden()

			expect(response.ok).toBe(false)
		})

		it('response status text matches standard HTTP 403', () => {
			const response = forbidden()

			// Status text might be empty in test environment
			expect(response.statusText).toMatch(/^(|Forbidden)$/)
		})

		it('response body can be read multiple times through clone', async () => {
			const response = forbidden()
			const clonedResponse = response.clone()

			const body1 = (await response.json()) as { error: string }
			const body2 = (await clonedResponse.json()) as { error: string }

			expect(body1).toEqual(body2)
			expect(body1).toEqual({ error: 'Forbidden' })
		})
	})

	describe('error message consistency', () => {
		it('notFound and forbidden have different error messages', async () => {
			const notFoundResponse = notFound()
			const forbiddenResponse = forbidden()

			const notFoundBody = (await notFoundResponse.json()) as { error: string }
			const forbiddenBody = (await forbiddenResponse.json()) as { error: string }

			expect(notFoundBody.error).toBe('Not found')
			expect(forbiddenBody.error).toBe('Forbidden')
			expect(notFoundBody.error).not.toBe(forbiddenBody.error)
		})

		it('error messages match exact case sensitivity', async () => {
			const notFoundResponse = notFound()
			const forbiddenResponse = forbidden()

			const notFoundBody = (await notFoundResponse.json()) as { error: string }
			const forbiddenBody = (await forbiddenResponse.json()) as { error: string }

			// Verify exact case and format
			expect(notFoundBody.error).toBe('Not found')
			expect(notFoundBody.error).not.toBe('not found')
			expect(notFoundBody.error).not.toBe('Not Found')
			expect(notFoundBody.error).not.toBe('NOT FOUND')

			expect(forbiddenBody.error).toBe('Forbidden')
			expect(forbiddenBody.error).not.toBe('forbidden')
			expect(forbiddenBody.error).not.toBe('FORBIDDEN')
		})
	})

	describe('HTTP specification compliance', () => {
		it('notFound complies with HTTP 404 Not Found specification', () => {
			const response = notFound()

			// HTTP 404 should indicate the origin server did not find the resource
			expect(response.status).toBe(404)
			// Status text might be empty in test environment
			expect(response.statusText).toMatch(/^(|Not Found)$/)
			expect(response.ok).toBe(false)
		})

		it('forbidden complies with HTTP 403 Forbidden specification', () => {
			const response = forbidden()

			// HTTP 403 should indicate the server understood the request but refuses to authorize it
			expect(response.status).toBe(403)
			// Status text might be empty in test environment
			expect(response.statusText).toMatch(/^(|Forbidden)$/)
			expect(response.ok).toBe(false)
		})

		it('both responses include proper JSON content type', () => {
			const notFoundResponse = notFound()
			const forbiddenResponse = forbidden()

			expect(notFoundResponse.headers.get('content-type')).toBe('application/json')
			expect(forbiddenResponse.headers.get('content-type')).toBe('application/json')
		})
	})

	describe('response immutability and isolation', () => {
		it('responses are independent and do not share state', async () => {
			const response1 = notFound()
			const response2 = notFound()

			// Consuming one response should not affect the other
			const body1 = await response1.json()
			const body2 = await response2.json()

			expect(body1).toEqual({ error: 'Not found' })
			expect(body2).toEqual({ error: 'Not found' })
		})

		it('modifying response headers does not affect future responses', () => {
			const response1 = notFound()
			response1.headers.set('x-custom-header', 'test-value')

			const response2 = notFound()

			expect(response1.headers.get('x-custom-header')).toBe('test-value')
			expect(response2.headers.get('x-custom-header')).toBe(null)
		})

		it('forbidden and notFound responses are completely independent', async () => {
			const notFoundResponse = notFound()
			const forbiddenResponse = forbidden()

			// Consume notFound response
			await notFoundResponse.json()

			// Forbidden response should still work
			const forbiddenBody = await forbiddenResponse.json()
			expect(forbiddenBody).toEqual({ error: 'Forbidden' })
		})
	})

	describe('integration with web standards', () => {
		it('responses work with fetch Response API patterns', async () => {
			const notFoundResponse = notFound()

			// Should work with standard Response methods
			expect(typeof notFoundResponse.arrayBuffer).toBe('function')
			expect(typeof notFoundResponse.blob).toBe('function')
			expect(typeof notFoundResponse.formData).toBe('function')
			expect(typeof notFoundResponse.text).toBe('function')
			expect(typeof notFoundResponse.json).toBe('function')

			// Should be consumable as text
			const textContent = await notFoundResponse.text()
			expect(textContent).toBe('{"error":"Not found"}')
		})

		it('responses are compatible with Response.clone()', async () => {
			const originalResponse = forbidden()
			const clonedResponse = originalResponse.clone()

			expect(originalResponse.status).toBe(clonedResponse.status)
			expect(originalResponse.statusText).toBe(clonedResponse.statusText)
			expect(originalResponse.headers.get('content-type')).toBe(
				clonedResponse.headers.get('content-type')
			)

			const originalBody = await originalResponse.json()
			const clonedBody = await clonedResponse.json()

			expect(originalBody).toEqual(clonedBody)
		})

		it('responses have proper headers object', () => {
			const notFoundResponse = notFound()
			const forbiddenResponse = forbidden()

			// Headers might be a different implementation in test environment
			expect(notFoundResponse.headers).toBeTruthy()
			expect(forbiddenResponse.headers).toBeTruthy()

			// Headers should be iterable
			const notFoundHeaders = Array.from(notFoundResponse.headers.entries())
			const forbiddenHeaders = Array.from(forbiddenResponse.headers.entries())

			expect(notFoundHeaders).toContainEqual(['content-type', 'application/json'])
			expect(forbiddenHeaders).toContainEqual(['content-type', 'application/json'])
		})
	})

	describe('performance and memory characteristics', () => {
		it('functions execute quickly without blocking', () => {
			const startTime = Date.now()

			// Execute functions multiple times
			for (let i = 0; i < 100; i++) {
				notFound()
				forbidden()
			}

			const endTime = Date.now()
			const executionTime = endTime - startTime

			// Should complete quickly (less than 100ms for 100 iterations)
			expect(executionTime).toBeLessThan(100)
		})

		it('functions do not retain references to previous calls', () => {
			// Create responses
			const responses = []
			for (let i = 0; i < 10; i++) {
				responses.push(notFound())
				responses.push(forbidden())
			}

			// All responses should be independent instances
			const statusCodes = responses.map((r) => r.status)
			expect(statusCodes).toContain(404)
			expect(statusCodes).toContain(403)

			// Each response should be a separate object
			const uniqueObjects = new Set(responses)
			expect(uniqueObjects.size).toBe(responses.length)
		})
	})

	describe('error object structure validation', () => {
		it('notFound returns object with exactly one error property', async () => {
			const response = notFound()
			const body = (await response.json()) as { error: string }

			const keys = Object.keys(body as object)
			expect(keys).toEqual(['error'])
			expect(keys.length).toBe(1)
		})

		it('forbidden returns object with exactly one error property', async () => {
			const response = forbidden()
			const body = (await response.json()) as { error: string }

			const keys = Object.keys(body as object)
			expect(keys).toEqual(['error'])
			expect(keys.length).toBe(1)
		})

		it('error property values are strings', async () => {
			const notFoundResponse = notFound()
			const forbiddenResponse = forbidden()

			const notFoundBody = (await notFoundResponse.json()) as { error: string }
			const forbiddenBody = (await forbiddenResponse.json()) as { error: string }

			expect(typeof (notFoundBody as { error: string }).error).toBe('string')
			expect(typeof (forbiddenBody as { error: string }).error).toBe('string')
		})

		it('error property values are non-empty strings', async () => {
			const notFoundResponse = notFound()
			const forbiddenResponse = forbidden()

			const notFoundBody = (await notFoundResponse.json()) as { error: string }
			const forbiddenBody = (await forbiddenResponse.json()) as { error: string }

			expect((notFoundBody as { error: string }).error.length).toBeGreaterThan(0)
			expect((forbiddenBody as { error: string }).error.length).toBeGreaterThan(0)
		})

		it('JSON objects have no prototype pollution', async () => {
			const response = notFound()
			const body = (await response.json()) as { error: string }

			// Should not have inherited properties that could indicate prototype pollution
			expect((body as any).constructor).toBe(Object)
			expect((body as any).__proto__).toBe(Object.prototype)
			expect(Object.getPrototypeOf(body as object)).toBe(Object.prototype)
		})
	})
})
