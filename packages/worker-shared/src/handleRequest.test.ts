import { T } from '@tldraw/validate'
import { IRequest, StatusError } from 'itty-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createRouter,
	handleApiRequest,
	parseRequestBody,
	parseRequestQuery,
	type ApiRoute,
	type ApiRouter,
} from './handleRequest'
import { SentryEnvironment, createSentry } from './sentry'

// Mock the sentry module
vi.mock('./sentry', () => ({
	createSentry: vi.fn().mockReturnValue({
		captureException: vi.fn(),
	}),
}))

// Mock console methods to avoid noise in tests
const originalConsole = { ...console }
beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
	Object.assign(console, originalConsole)
})

describe('handleRequest', () => {
	describe('createRouter', () => {
		it('returns a router instance', () => {
			const router = createRouter()
			expect(router).toBeDefined()
			expect(typeof router.fetch).toBe('function')
		})

		it('creates router with proper type constraints', () => {
			interface TestEnv extends SentryEnvironment {
				DATABASE_URL: string
			}

			const router = createRouter<TestEnv>()

			expect(router).toBeDefined()
			expect(typeof router.get).toBe('function')
			expect(typeof router.post).toBe('function')
			expect(typeof router.put).toBe('function')
			expect(typeof router.delete).toBe('function')
			expect(typeof router.patch).toBe('function')
			expect(typeof router.all).toBe('function')
		})

		it('creates independent router instances', () => {
			const router1 = createRouter()
			const router2 = createRouter()

			expect(router1).not.toBe(router2)
		})

		it('router has all expected methods', () => {
			const router = createRouter()

			const expectedMethods = [
				'get',
				'post',
				'put',
				'delete',
				'patch',
				'head',
				'options',
				'all',
				'fetch',
			]
			expectedMethods.forEach((method) => {
				expect(typeof (router as any)[method]).toBe('function')
			})
		})
	})

	describe('handleApiRequest', () => {
		let mockRouter: ApiRouter<SentryEnvironment, ExecutionContext>
		let mockRequest: Request
		let mockEnv: SentryEnvironment
		let mockCtx: ExecutionContext
		let mockAfter: (response: Response) => Response

		beforeEach(() => {
			mockRouter = {
				fetch: vi.fn(),
			} as any

			mockRequest = new Request('https://example.com/test')

			mockEnv = {
				SENTRY_DSN: 'https://test@sentry.io/123',
				TLDRAW_ENV: 'test',
				WORKER_NAME: 'test-worker',
			}

			mockCtx = {
				waitUntil: vi.fn(),
				passThroughOnException: vi.fn(),
				props: {},
			} as any

			mockAfter = vi.fn((response: Response) => {
				response.headers.set('X-Custom-Header', 'test')
				return response
			})
		})

		describe('successful request handling', () => {
			it('handles successful router response', async () => {
				const mockResponse = Response.json({ success: true })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(mockRouter.fetch).toHaveBeenCalledWith(mockRequest, mockEnv, mockCtx)
				expect(mockAfter).toHaveBeenCalledWith(mockResponse)
				expect(result.headers.get('X-Custom-Header')).toBe('test')
			})

			it('passes correct parameters to router.fetch', async () => {
				const mockResponse = Response.json({ data: 'test' })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(mockRouter.fetch).toHaveBeenCalledTimes(1)
				expect(mockRouter.fetch).toHaveBeenCalledWith(mockRequest, mockEnv, mockCtx)
			})

			it('applies after function to successful response', async () => {
				const mockResponse = Response.json({ test: 'data' })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(mockAfter).toHaveBeenCalledWith(mockResponse)
				expect(result.headers.get('X-Custom-Header')).toBe('test')
			})

			it('handles async after function', async () => {
				const mockResponse = Response.json({ test: 'data' })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const asyncAfter = vi.fn(async (response: Response) => {
					await new Promise((resolve) => setTimeout(resolve, 1))
					response.headers.set('X-Async-Header', 'async-value')
					return response
				})

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: asyncAfter,
				})

				expect(asyncAfter).toHaveBeenCalledWith(mockResponse)
				expect(result.headers.get('X-Async-Header')).toBe('async-value')
			})
		})

		describe('StatusError handling', () => {
			it('handles StatusError with proper status and message', async () => {
				const statusError = new StatusError(400, 'Bad request parameter')
				vi.mocked(mockRouter.fetch).mockRejectedValue(statusError)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.status).toBe(400)
				const body = (await result.json()) as { error: string }
				expect(body.error).toBe('Bad request parameter')
				expect(console.error).toHaveBeenCalledWith(`400: ${statusError.stack}`)
			})

			it('handles StatusError with different status codes', async () => {
				const testCases = [
					{ status: 400, message: 'Bad Request' },
					{ status: 401, message: 'Unauthorized' },
					{ status: 403, message: 'Forbidden' },
					{ status: 404, message: 'Not Found' },
					{ status: 422, message: 'Unprocessable Entity' },
					{ status: 500, message: 'Internal Server Error' },
				]

				for (const testCase of testCases) {
					const statusError = new StatusError(testCase.status, testCase.message)
					vi.mocked(mockRouter.fetch).mockRejectedValue(statusError)

					const result = await handleApiRequest({
						router: mockRouter,
						request: mockRequest,
						env: mockEnv,
						ctx: mockCtx,
						after: mockAfter,
					})

					expect(result.status).toBe(testCase.status)
					const body = (await result.json()) as { error: string }
					expect(body.error).toBe(testCase.message)
				}
			})

			it('applies after function to StatusError responses', async () => {
				const statusError = new StatusError(404, 'Not found')
				vi.mocked(mockRouter.fetch).mockRejectedValue(statusError)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.headers.get('X-Custom-Header')).toBe('test')
				expect(mockAfter).toHaveBeenCalled()
			})

			it('logs StatusError with proper format', async () => {
				const statusError = new StatusError(422, 'Validation failed')
				vi.mocked(mockRouter.fetch).mockRejectedValue(statusError)

				await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(console.error).toHaveBeenCalledWith(`422: ${statusError.stack}`)
			})
		})

		describe('generic error handling', () => {
			it('handles generic Error with 500 status', async () => {
				const genericError = new Error('Something went wrong')
				vi.mocked(mockRouter.fetch).mockRejectedValue(genericError)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.status).toBe(500)
				const body = (await result.json()) as { error: string }
				expect(body.error).toBe('Internal server error')
			})

			it('logs generic error with stack trace', async () => {
				const genericError = new Error('Test error')
				vi.mocked(mockRouter.fetch).mockRejectedValue(genericError)

				await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(console.error).toHaveBeenCalledWith(genericError.stack)
			})

			it('logs error without stack if stack is unavailable', async () => {
				const errorWithoutStack = { message: 'Error without stack' }
				vi.mocked(mockRouter.fetch).mockRejectedValue(errorWithoutStack)

				await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(console.error).toHaveBeenCalledWith(errorWithoutStack)
			})

			it('sends error to Sentry for generic errors', async () => {
				const genericError = new Error('Sentry test error')
				vi.mocked(mockRouter.fetch).mockRejectedValue(genericError)

				const mockSentryInstance = { captureException: vi.fn() }
				vi.mocked(createSentry).mockReturnValue(mockSentryInstance as any)

				await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(createSentry).toHaveBeenCalledWith(mockCtx, mockEnv, mockRequest)
				expect(mockSentryInstance.captureException).toHaveBeenCalledWith(genericError)
			})

			it('handles null Sentry instance gracefully', async () => {
				const genericError = new Error('Error when Sentry is null')
				vi.mocked(mockRouter.fetch).mockRejectedValue(genericError)
				vi.mocked(createSentry).mockReturnValue(null)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.status).toBe(500)
				// Should not throw even with null Sentry
			})

			it('applies after function to generic error responses', async () => {
				const genericError = new Error('Test error')
				vi.mocked(mockRouter.fetch).mockRejectedValue(genericError)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.headers.get('X-Custom-Header')).toBe('test')
				expect(mockAfter).toHaveBeenCalled()
			})
		})

		describe('after function error handling', () => {
			it('handles after function throwing error', async () => {
				const mockResponse = Response.json({ success: true })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const failingAfter = vi.fn(() => {
					throw new Error('After function failed')
				})

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: failingAfter,
				})

				expect(result.status).toBe(500)
				const body = (await result.json()) as { error: string }
				expect(body.error).toBe('Internal server error')
			})

			it('handles async after function throwing error', async () => {
				const mockResponse = Response.json({ success: true })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const failingAsyncAfter = vi.fn(async () => {
					await new Promise((resolve) => setTimeout(resolve, 1))
					throw new Error('Async after function failed')
				})

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: failingAsyncAfter,
				})

				expect(result.status).toBe(500)
				const body = (await result.json()) as { error: string }
				expect(body.error).toBe('Internal server error')
			})

			it('logs after function error with stack trace', async () => {
				const mockResponse = Response.json({ success: true })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const afterError = new Error('After error with stack')
				const failingAfter = vi.fn(() => {
					throw afterError
				})

				await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: failingAfter,
				})

				expect(console.error).toHaveBeenCalledWith(afterError.stack)
			})

			it('sends after function error to Sentry', async () => {
				const mockResponse = Response.json({ success: true })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const afterError = new Error('After function Sentry error')
				const failingAfter = vi.fn(() => {
					throw afterError
				})

				const mockSentryInstance = { captureException: vi.fn() }
				vi.mocked(createSentry).mockReturnValue(mockSentryInstance as any)

				await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: failingAfter,
				})

				expect(mockSentryInstance.captureException).toHaveBeenCalledWith(afterError)
			})

			it('handles after function error when Sentry is null', async () => {
				const mockResponse = Response.json({ success: true })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const failingAfter = vi.fn(() => {
					throw new Error('After error with null Sentry')
				})

				vi.mocked(createSentry).mockReturnValue(null)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: failingAfter,
				})

				expect(result.status).toBe(500)
				// Should not throw even with null Sentry
			})
		})

		describe('edge cases', () => {
			it('handles router returning null', async () => {
				vi.mocked(mockRouter.fetch).mockResolvedValue(null as any)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(mockAfter).toHaveBeenCalledWith(null)
			})

			it('handles router returning undefined', async () => {
				vi.mocked(mockRouter.fetch).mockResolvedValue(undefined as any)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(mockAfter).toHaveBeenCalledWith(undefined)
			})

			it('handles non-Error objects thrown from router', async () => {
				const nonErrorObject = { message: 'Not an Error instance', code: 'CUSTOM_ERROR' }
				vi.mocked(mockRouter.fetch).mockRejectedValue(nonErrorObject)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.status).toBe(500)
				const body = (await result.json()) as { error: string }
				expect(body.error).toBe('Internal server error')
			})

			it('handles string thrown from router', async () => {
				const errorString = 'String error message'
				vi.mocked(mockRouter.fetch).mockRejectedValue(errorString)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.status).toBe(500)
				expect(console.error).toHaveBeenCalledWith(errorString)
			})

			it('handles number thrown from router', async () => {
				const errorNumber = 42
				vi.mocked(mockRouter.fetch).mockRejectedValue(errorNumber)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result.status).toBe(500)
				expect(console.error).toHaveBeenCalledWith(errorNumber)
			})
		})

		describe('multiple error scenarios', () => {
			it('handles router error followed by after function error', async () => {
				const routerError = new Error('Router failed')
				vi.mocked(mockRouter.fetch).mockRejectedValue(routerError)

				const failingAfter = vi.fn(() => {
					throw new Error('After also failed')
				})

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: failingAfter,
				})

				// Should return the after function error response
				expect(result.status).toBe(500)
				const body = (await result.json()) as { error: string }
				expect(body.error).toBe('Internal server error')

				// Both errors should be logged
				expect(console.error).toHaveBeenCalledTimes(2)
			})

			it('handles StatusError followed by after function error', async () => {
				const statusError = new StatusError(400, 'Bad request')
				vi.mocked(mockRouter.fetch).mockRejectedValue(statusError)

				const failingAfter = vi.fn(() => {
					throw new Error('After function error')
				})

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: failingAfter,
				})

				// Should return the after function error response (500)
				expect(result.status).toBe(500)
				const body = (await result.json()) as { error: string }
				expect(body.error).toBe('Internal server error')
			})
		})

		describe('response characteristics', () => {
			it('returns proper Response instances', async () => {
				const mockResponse = Response.json({ test: 'data' })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: mockAfter,
				})

				expect(result).toBeInstanceOf(Response)
			})

			it('maintains response headers from after function', async () => {
				const mockResponse = Response.json({ test: 'data' })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const headerAfter = vi.fn((response: Response) => {
					response.headers.set('X-Test-Header', 'test-value')
					response.headers.set('X-Another-Header', 'another-value')
					return response
				})

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: headerAfter,
				})

				expect(result.headers.get('X-Test-Header')).toBe('test-value')
				expect(result.headers.get('X-Another-Header')).toBe('another-value')
			})

			it('allows after function to modify response status', async () => {
				const mockResponse = Response.json({ test: 'data' }, { status: 200 })
				vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

				const statusAfter = vi.fn((response: Response) => {
					return new Response(response.body, {
						status: 202,
						statusText: 'Accepted',
						headers: response.headers,
					})
				})

				const result = await handleApiRequest({
					router: mockRouter,
					request: mockRequest,
					env: mockEnv,
					ctx: mockCtx,
					after: statusAfter,
				})

				expect(result.status).toBe(202)
				expect(result.statusText).toBe('Accepted')
			})
		})
	})

	describe('parseRequestQuery', () => {
		let mockRequest: IRequest

		beforeEach(() => {
			mockRequest = {
				query: {},
			} as IRequest
		})

		describe('successful parsing', () => {
			it('parses valid query parameters', () => {
				const validator = T.object({
					name: T.string,
					age: T.string, // Query params are always strings
				})

				mockRequest.query = { name: 'John', age: '30' }

				const result = parseRequestQuery(mockRequest, validator)

				expect(result).toEqual({ name: 'John', age: '30' })
			})

			it('parses optional query parameters', () => {
				const validator = T.object({
					name: T.string,
					age: T.string.optional(), // Query params are always strings
					active: T.string.optional(),
				})

				mockRequest.query = { name: 'Alice' }

				const result = parseRequestQuery(mockRequest, validator)

				expect(result).toEqual({ name: 'Alice' })
			})

			it('handles complex validators', () => {
				const validator = T.object({
					url: T.string, // In real usage would be T.httpUrl
					limit: T.string.optional(), // Query params are always strings
					format: T.literalEnum('json', 'xml').optional(),
				})

				mockRequest.query = {
					url: 'https://example.com',
					limit: '10',
					format: 'json',
				}

				const result = parseRequestQuery(mockRequest, validator)

				expect(result).toEqual({
					url: 'https://example.com',
					limit: '10',
					format: 'json',
				})
			})

			it('handles array query parameters', () => {
				const validator = T.object({
					tags: T.arrayOf(T.string),
					numbers: T.arrayOf(T.string).optional(), // Array of strings from query params
				})

				mockRequest.query = {
					tags: ['tag1', 'tag2', 'tag3'],
					numbers: ['1', '2', '3'],
				}

				const result = parseRequestQuery(mockRequest, validator)

				expect(result).toEqual({
					tags: ['tag1', 'tag2', 'tag3'],
					numbers: ['1', '2', '3'],
				})
			})

			it('handles nested object validators (via JSON string)', () => {
				const validator = T.object({
					data: T.string, // JSON string that will be parsed elsewhere
					theme: T.literalEnum('light', 'dark'),
				})

				mockRequest.query = {
					data: '{"user":"John","settings":"config"}',
					theme: 'dark',
				}

				const result = parseRequestQuery(mockRequest, validator)

				expect(result).toEqual({
					data: '{"user":"John","settings":"config"}',
					theme: 'dark',
				})
			})

			it('handles empty query object with optional fields only', () => {
				const validator = T.object({
					name: T.string.optional(),
					age: T.number.optional(),
				})

				mockRequest.query = {}

				const result = parseRequestQuery(mockRequest, validator)

				expect(result).toEqual({})
			})

			it('preserves original query parameter types', () => {
				const validator = T.object({
					string: T.string,
					number: T.string, // Query params are strings
					boolean: T.string, // Query params are strings
					nullValue: T.any,
				})

				mockRequest.query = {
					string: 'text',
					number: '42',
					boolean: 'true',
					nullValue: 'null',
				}

				const result = parseRequestQuery(mockRequest, validator)

				expect(result.string).toBe('text')
				expect(result.number).toBe('42')
				expect(result.boolean).toBe('true')
				expect(result.nullValue).toBe('null') // T.any keeps it as string
				expect(typeof result.string).toBe('string')
				expect(typeof result.number).toBe('string')
				expect(typeof result.boolean).toBe('string')
			})
		})

		describe('validation error handling', () => {
			it('throws StatusError with 400 status for validation failure', () => {
				const validator = T.object({
					name: T.string,
					age: T.number,
				})

				mockRequest.query = { name: 'John', age: 'not-a-number' }

				expect(() => parseRequestQuery(mockRequest, validator)).toThrow(StatusError)

				try {
					parseRequestQuery(mockRequest, validator)
				} catch (error) {
					expect(error).toBeInstanceOf(StatusError)
					expect((error as StatusError).status).toBe(400)
					expect((error as StatusError).message).toMatch(/Query parameters:/)
				}
			})

			it('includes validation error message in StatusError', () => {
				const validator = T.object({
					email: T.string,
				})

				mockRequest.query = { email: '123' }

				try {
					parseRequestQuery(mockRequest, validator)
				} catch (error) {
					expect(error).toBeInstanceOf(StatusError)
					expect((error as StatusError).message).toContain('Query parameters:')
					// The exact validation error message will vary based on the validator
				}
			})

			it('throws StatusError for missing required fields', () => {
				const validator = T.object({
					required: T.string,
				})

				mockRequest.query = {}

				expect(() => parseRequestQuery(mockRequest, validator)).toThrow(StatusError)
			})

			it('validates string query parameters correctly', () => {
				const validator = T.object({
					count: T.string,
				})

				mockRequest.query = { count: 'valid-string' }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.count).toBe('valid-string')
			})

			it('throws StatusError for enum validation failure', () => {
				const validator = T.object({
					status: T.literalEnum('active', 'inactive'),
				})

				mockRequest.query = { status: 'pending' }

				expect(() => parseRequestQuery(mockRequest, validator)).toThrow(StatusError)
			})

			it('re-throws non-ValidationError exceptions', () => {
				const validator = {
					validate: vi.fn(() => {
						throw new Error('Non-validation error')
					}),
				} as any

				mockRequest.query = { test: 'value' }

				expect(() => parseRequestQuery(mockRequest, validator)).toThrow('Non-validation error')
				expect(() => parseRequestQuery(mockRequest, validator)).not.toThrow(StatusError)
			})

			it('handles complex validation error messages', () => {
				const validator = T.object({
					count: T.number,
					data: T.string,
				})

				mockRequest.query = {
					count: 'invalid-number',
					data: 'valid-string',
				}

				try {
					parseRequestQuery(mockRequest, validator)
				} catch (error) {
					expect(error).toBeInstanceOf(StatusError)
					expect((error as StatusError).message).toMatch(/Query parameters:/)
				}
			})
		})

		describe('edge cases', () => {
			it('handles null query object', () => {
				const validator = T.object({
					name: T.string.optional(),
				})

				mockRequest.query = null as any

				expect(() => parseRequestQuery(mockRequest, validator)).toThrow()
			})

			it('handles undefined query object', () => {
				const validator = T.object({
					name: T.string.optional(),
				})

				mockRequest.query = undefined as any

				expect(() => parseRequestQuery(mockRequest, validator)).toThrow()
			})

			it('handles malformed query structure', () => {
				const validator = T.object({
					name: T.string,
				})

				// Query should be an object but is a primitive
				mockRequest.query = 'not-an-object' as any

				expect(() => parseRequestQuery(mockRequest, validator)).toThrow(StatusError)
			})

			it('handles circular reference in query', () => {
				const validator = T.object({
					data: T.any,
				})

				const circular: any = { self: null }
				circular.self = circular
				mockRequest.query = { data: circular }

				// This should not throw due to circular reference (validator handles it)
				const result = parseRequestQuery(mockRequest, validator)
				expect(result.data).toBeDefined()
			})

			it('handles very large query strings', () => {
				const validator = T.object({
					data: T.string,
					count: T.string,
				})

				const largeString = 'x'.repeat(10000) // Large string data

				mockRequest.query = {
					data: largeString,
					count: '1000',
				}

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.data).toHaveLength(10000)
				expect(result.count).toBe('1000')
			})
		})

		describe('validator integration', () => {
			it('works with T.string validator', () => {
				const validator = T.object({
					text: T.string,
				})

				mockRequest.query = { text: 'Hello World' }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.text).toBe('Hello World')
			})

			it('works with T.string validator for numeric strings', () => {
				const validator = T.object({
					count: T.string, // Query params are always strings
				})

				mockRequest.query = { count: '42' }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.count).toBe('42')
			})

			it('works with T.string validator for boolean strings', () => {
				const validator = T.object({
					enabled: T.string, // Query params are always strings
				})

				mockRequest.query = { enabled: 'true' }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.enabled).toBe('true')
			})

			it('works with T.literal validator', () => {
				const validator = T.object({
					type: T.literal('test'),
				})

				mockRequest.query = { type: 'test' }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.type).toBe('test')
			})

			it('works with T.union validator', () => {
				const validator = T.object({
					status: T.literalEnum('draft', 'published'),
				})

				mockRequest.query = { status: 'published' }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.status).toBe('published')
			})

			it('works with T.array validator', () => {
				const validator = T.object({
					tags: T.arrayOf(T.string),
				})

				mockRequest.query = { tags: ['tag1', 'tag2'] }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.tags).toEqual(['tag1', 'tag2'])
			})

			it('works with T.nullable validator', () => {
				const validator = T.object({
					optional: T.string.nullable(),
				})

				mockRequest.query = { optional: 'some-value' }

				const result = parseRequestQuery(mockRequest, validator)
				expect(result.optional).toBe('some-value')
			})
		})
	})

	describe('parseRequestBody', () => {
		let mockRequest: IRequest

		beforeEach(() => {
			mockRequest = {
				json: vi.fn(),
			} as any
		})

		describe('successful parsing', () => {
			it('parses valid JSON body', async () => {
				const validator = T.object({
					name: T.string,
					age: T.number,
				})

				const bodyData = { name: 'John', age: 30 }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)

				expect(mockRequest.json).toHaveBeenCalledTimes(1)
				expect(result).toEqual(bodyData)
			})

			it('parses complex nested JSON body', async () => {
				const validator = T.object({
					user: T.object({
						profile: T.object({
							name: T.string,
							email: T.string,
						}),
						preferences: T.object({
							theme: T.literalEnum('light', 'dark'),
							notifications: T.boolean,
						}),
					}),
					metadata: T.object({
						timestamp: T.number,
						version: T.string,
					}),
				})

				const bodyData = {
					user: {
						profile: {
							name: 'Alice',
							email: 'alice@example.com',
						},
						preferences: {
							theme: 'dark',
							notifications: true,
						},
					},
					metadata: {
						timestamp: Date.now(),
						version: '1.0.0',
					},
				}

				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result).toEqual(bodyData)
			})

			it('parses JSON body with optional fields', async () => {
				const validator = T.object({
					name: T.string,
					age: T.number.optional(),
					email: T.string.optional(),
				})

				const bodyData = { name: 'Bob' }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result).toEqual(bodyData)
			})

			it('parses JSON body with arrays', async () => {
				const validator = T.object({
					items: T.arrayOf(
						T.object({
							id: T.number,
							name: T.string,
							tags: T.arrayOf(T.string),
						})
					),
					categories: T.arrayOf(T.string),
				})

				const bodyData = {
					items: [
						{ id: 1, name: 'Item 1', tags: ['tag1', 'tag2'] },
						{ id: 2, name: 'Item 2', tags: ['tag3'] },
					],
					categories: ['category1', 'category2'],
				}

				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result).toEqual(bodyData)
			})

			it('preserves data types after validation', async () => {
				const validator = T.object({
					string: T.string,
					number: T.number,
					boolean: T.boolean,
					nullValue: T.any,
					arrayOfNumbers: T.arrayOf(T.number),
				})

				const bodyData = {
					string: 'test',
					number: 42,
					boolean: false,
					nullValue: null,
					arrayOfNumbers: [1, 2, 3],
				}

				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)

				expect(typeof result.string).toBe('string')
				expect(typeof result.number).toBe('number')
				expect(typeof result.boolean).toBe('boolean')
				expect(result.nullValue).toBe(null)
				expect(Array.isArray(result.arrayOfNumbers)).toBe(true)
				expect(result.arrayOfNumbers.every((n) => typeof n === 'number')).toBe(true)
			})

			it('handles empty object body', async () => {
				const validator = T.object({
					name: T.string.optional(),
					age: T.number.optional(),
				})

				const bodyData = {}
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result).toEqual({})
			})
		})

		describe('validation error handling', () => {
			it('throws StatusError with 400 status for validation failure', async () => {
				const validator = T.object({
					name: T.string,
					age: T.number,
				})

				const invalidBodyData = { name: 'John', age: 'not-a-number' }
				vi.mocked(mockRequest.json).mockResolvedValue(invalidBodyData)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(StatusError)

				try {
					await parseRequestBody(mockRequest, validator)
				} catch (error) {
					expect(error).toBeInstanceOf(StatusError)
					expect((error as StatusError).status).toBe(400)
					expect((error as StatusError).message).toMatch(/Body:/)
				}
			})

			it('includes validation error message in StatusError', async () => {
				const validator = T.object({
					email: T.string,
				})

				const invalidBodyData = { email: 123 }
				vi.mocked(mockRequest.json).mockResolvedValue(invalidBodyData)

				try {
					await parseRequestBody(mockRequest, validator)
				} catch (error) {
					expect(error).toBeInstanceOf(StatusError)
					expect((error as StatusError).message).toContain('Body:')
				}
			})

			it('throws StatusError for missing required fields', async () => {
				const validator = T.object({
					required: T.string,
				})

				const bodyData = {}
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(StatusError)
			})

			it('throws StatusError for type mismatches', async () => {
				const validator = T.object({
					count: T.number,
				})

				const bodyData = { count: 'not-a-number' }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(StatusError)
			})

			it('throws StatusError for enum validation failure', async () => {
				const validator = T.object({
					status: T.literalEnum('active', 'inactive'),
				})

				const bodyData = { status: 'pending' }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(StatusError)
			})

			it('re-throws non-ValidationError exceptions', async () => {
				const validator = {
					validate: vi.fn(() => {
						throw new Error('Non-validation error')
					}),
				} as any

				const bodyData = { test: 'value' }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(
					'Non-validation error'
				)
				await expect(parseRequestBody(mockRequest, validator)).rejects.not.toThrow(StatusError)
			})

			it('handles nested validation errors', async () => {
				const validator = T.object({
					user: T.object({
						profile: T.object({
							age: T.number,
						}),
					}),
				})

				const bodyData = {
					user: {
						profile: {
							age: 'invalid-age',
						},
					},
				}
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				try {
					await parseRequestBody(mockRequest, validator)
				} catch (error) {
					expect(error).toBeInstanceOf(StatusError)
					expect((error as StatusError).message).toMatch(/Body:/)
				}
			})
		})

		describe('JSON parsing error handling', () => {
			it('re-throws JSON parsing errors as-is', async () => {
				const validator = T.object({
					name: T.string,
				})

				const jsonError = new SyntaxError('Unexpected token in JSON')
				vi.mocked(mockRequest.json).mockRejectedValue(jsonError)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(jsonError)
			})

			it('handles request.json() returning non-object values', async () => {
				const validator = T.object({
					name: T.string,
				})

				// JSON could be a primitive value
				vi.mocked(mockRequest.json).mockResolvedValue('not-an-object')

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(StatusError)
			})

			it('handles request.json() returning null', async () => {
				const validator = T.object({
					name: T.string.optional(),
				})

				vi.mocked(mockRequest.json).mockResolvedValue(null)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(StatusError)
			})

			it('handles request.json() returning array when object expected', async () => {
				const validator = T.object({
					name: T.string,
				})

				vi.mocked(mockRequest.json).mockResolvedValue(['not', 'an', 'object'])

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(StatusError)
			})
		})

		describe('async behavior', () => {
			it('properly awaits request.json()', async () => {
				const validator = T.object({
					name: T.string,
				})

				const bodyData = { name: 'Test' }

				// Simulate async JSON parsing
				vi.mocked(mockRequest.json).mockImplementation(() => {
					return new Promise((resolve) => {
						setTimeout(() => resolve(bodyData), 10)
					})
				})

				const result = await parseRequestBody(mockRequest, validator)

				expect(result).toEqual(bodyData)
			})

			it('handles JSON parsing that takes time', async () => {
				const validator = T.object({
					data: T.string,
				})

				const bodyData = { data: 'large-data-payload' }

				vi.mocked(mockRequest.json).mockImplementation(() => {
					return new Promise((resolve) => {
						setTimeout(() => resolve(bodyData), 50)
					})
				})

				const startTime = Date.now()
				const result = await parseRequestBody(mockRequest, validator)
				const endTime = Date.now()

				expect(result).toEqual(bodyData)
				expect(endTime - startTime).toBeGreaterThanOrEqual(50)
			})

			it('handles request.json() promise rejection', async () => {
				const validator = T.object({
					name: T.string,
				})

				const jsonError = new Error('Network error during JSON parsing')
				vi.mocked(mockRequest.json).mockRejectedValue(jsonError)

				await expect(parseRequestBody(mockRequest, validator)).rejects.toThrow(jsonError)
			})
		})

		describe('edge cases', () => {
			it('handles very large JSON bodies', async () => {
				const validator = T.object({
					items: T.arrayOf(
						T.object({
							id: T.number,
							data: T.string,
						})
					),
				})

				const largeBody = {
					items: Array.from({ length: 10000 }, (_, i) => ({
						id: i,
						data: `data-${i}`.repeat(100), // Large string data
					})),
				}

				vi.mocked(mockRequest.json).mockResolvedValue(largeBody)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result.items).toHaveLength(10000)
				expect(result.items[0].data).toContain('data-0')
			})

			it('handles deeply nested JSON structures', async () => {
				const validator = T.object({
					level1: T.object({
						level2: T.object({
							level3: T.object({
								level4: T.object({
									value: T.string,
								}),
							}),
						}),
					}),
				})

				const deepBody = {
					level1: {
						level2: {
							level3: {
								level4: {
									value: 'deep-value',
								},
							},
						},
					},
				}

				vi.mocked(mockRequest.json).mockResolvedValue(deepBody)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result.level1.level2.level3.level4.value).toBe('deep-value')
			})

			it('handles JSON with special characters', async () => {
				const validator = T.object({
					message: T.string,
					emoji: T.string,
					unicode: T.string,
				})

				const specialBody = {
					message: 'Hello "World" with \'quotes\' and \n newlines',
					emoji: '🚀🌟💻',
					unicode: 'héllo wörld with ñ and €',
				}

				vi.mocked(mockRequest.json).mockResolvedValue(specialBody)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result).toEqual(specialBody)
			})

			it('handles JSON with circular references gracefully', async () => {
				const validator = T.any // Use any to accept circular structure

				const circular: any = { name: 'circular' }
				circular.self = circular

				vi.mocked(mockRequest.json).mockResolvedValue(circular)

				const result = await parseRequestBody(mockRequest, validator)

				expect(result.name).toBe('circular')
				expect(result.self).toBe(result)
			})
		})

		describe('validator integration', () => {
			it('integrates with T.string validator', async () => {
				const validator = T.object({
					text: T.string,
				})

				const bodyData = { text: 'Hello' }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)
				expect(result.text).toBe('Hello')
			})

			it('integrates with T.number validator', async () => {
				const validator = T.object({
					count: T.number,
				})

				const bodyData = { count: 42 }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)
				expect(result.count).toBe(42)
			})

			it('integrates with T.boolean validator', async () => {
				const validator = T.object({
					enabled: T.boolean,
				})

				const bodyData = { enabled: true }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)
				expect(result.enabled).toBe(true)
			})

			it('integrates with T.literal validator', async () => {
				const validator = T.object({
					type: T.literal('user'),
				})

				const bodyData = { type: 'user' }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)
				expect(result.type).toBe('user')
			})

			it('integrates with T.union validator', async () => {
				const validator = T.object({
					role: T.literalEnum('admin', 'user', 'guest'),
				})

				const bodyData = { role: 'admin' }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)
				expect(result.role).toBe('admin')
			})

			it('integrates with T.array validator', async () => {
				const validator = T.object({
					permissions: T.arrayOf(T.string),
				})

				const bodyData = { permissions: ['read', 'write', 'delete'] }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)
				expect(result.permissions).toEqual(['read', 'write', 'delete'])
			})

			it('integrates with T.nullable validator', async () => {
				const validator = T.object({
					description: T.string.nullable(),
				})

				const bodyData = { description: null }
				vi.mocked(mockRequest.json).mockResolvedValue(bodyData)

				const result = await parseRequestBody(mockRequest, validator)
				expect(result.description).toBe(null)
			})
		})
	})

	describe('type safety and TypeScript integration', () => {
		describe('ApiRoute type', () => {
			it('should accept proper route handler signature', () => {
				interface TestEnv extends SentryEnvironment {
					DATABASE_URL: string
				}

				// This should compile without errors
				const testRoute: ApiRoute<TestEnv, ExecutionContext> = (path, ...handlers) => {
					// Mock implementation
					return {} as any
				}

				expect(testRoute).toBeDefined()
			})
		})

		describe('ApiRouter type', () => {
			it('should type router methods correctly', () => {
				interface TestEnv extends SentryEnvironment {
					API_KEY: string
				}

				const router: ApiRouter<TestEnv, ExecutionContext> = createRouter<TestEnv>()

				// These method calls should have proper typing
				expect(typeof router.get).toBe('function')
				expect(typeof router.post).toBe('function')
				expect(typeof router.put).toBe('function')
				expect(typeof router.delete).toBe('function')
			})
		})

		describe('function parameter typing', () => {
			it('ensures handleApiRequest maintains type constraints', async () => {
				interface TypedEnv extends SentryEnvironment {
					SECRET_KEY: string
				}

				const router = createRouter<TypedEnv>()
				const request = new Request('https://test.com')
				const env: TypedEnv = {
					SECRET_KEY: 'test-secret',
					SENTRY_DSN: 'https://test@sentry.io/123',
				}
				const ctx: ExecutionContext = {
					waitUntil: vi.fn(),
					passThroughOnException: vi.fn(),
					props: {},
				} as any

				const mockResponse = Response.json({ success: true })
				vi.spyOn(router, 'fetch').mockResolvedValue(mockResponse)

				const result = await handleApiRequest({
					router,
					request,
					env,
					ctx,
					after: (response) => response,
				})

				expect(result).toBeInstanceOf(Response)
			})
		})
	})

	describe('integration scenarios', () => {
		describe('real-world usage patterns', () => {
			it('handles typical API endpoint flow', async () => {
				interface WorkerEnv extends SentryEnvironment {
					DATABASE_URL: string
					API_KEY: string
				}

				const router = createRouter<WorkerEnv>()

				// Mock a GET endpoint with query validation
				vi.spyOn(router, 'fetch').mockImplementation(async (request) => {
					if (request.url.includes('/api/users')) {
						// Simulate parseRequestQuery usage
						const mockRequest = {
							query: { page: '1', limit: '10' },
							route: '/api/users',
							params: {},
						} as unknown as IRequest
						const queryValidator = T.object({
							page: T.string.optional(),
							limit: T.string.optional(),
						})

						const queryParams = parseRequestQuery(mockRequest, queryValidator)

						return Response.json({
							users: [],
							pagination: {
								page: queryParams.page || '1',
								limit: queryParams.limit || '10',
							},
						})
					}

					return new Response('Not Found', { status: 404 })
				})

				const request = new Request('https://api.example.com/api/users?page=1&limit=10')
				const env: WorkerEnv = {
					DATABASE_URL: 'postgres://localhost:5432/test',
					API_KEY: 'secret-api-key',
					SENTRY_DSN: 'https://test@sentry.io/123',
				}
				const ctx: ExecutionContext = {
					waitUntil: vi.fn(),
					passThroughOnException: vi.fn(),
					props: {},
				} as any

				const result = await handleApiRequest({
					router,
					request,
					env,
					ctx,
					after: (response) => {
						response.headers.set('Access-Control-Allow-Origin', '*')
						return response
					},
				})

				expect(result.status).toBe(200)
				expect(result.headers.get('Access-Control-Allow-Origin')).toBe('*')
				const body = (await result.json()) as any
				expect(body.pagination).toEqual({ page: '1', limit: '10' })
			})

			it('handles POST endpoint with body validation', async () => {
				const router = createRouter()

				vi.spyOn(router, 'fetch').mockImplementation(async (request) => {
					if (request.method === 'POST' && request.url.includes('/api/users')) {
						// Simulate parseRequestBody usage
						const mockRequest = {
							json: async () => ({ name: 'John Doe', email: 'john@example.com' }),
						} as unknown as IRequest

						const bodyValidator = T.object({
							name: T.string,
							email: T.string,
						})

						const bodyData = await parseRequestBody(mockRequest, bodyValidator)

						return Response.json(
							{
								user: {
									id: 123,
									...bodyData,
								},
							},
							{ status: 201 }
						)
					}

					return new Response('Not Found', { status: 404 })
				})

				const request = new Request('https://api.example.com/api/users', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
				})

				const env: SentryEnvironment = {}
				const ctx: ExecutionContext = {
					waitUntil: vi.fn(),
					passThroughOnException: vi.fn(),
					props: {},
				} as any

				const result = await handleApiRequest({
					router,
					request,
					env,
					ctx,
					after: (response) => response,
				})

				expect(result.status).toBe(201)
				const body = (await result.json()) as any
				expect(body.user).toEqual({
					id: 123,
					name: 'John Doe',
					email: 'john@example.com',
				})
			})

			it('handles validation errors in typical workflow', async () => {
				const router = createRouter()

				vi.spyOn(router, 'fetch').mockImplementation(async () => {
					// Simulate validation error during request processing
					const mockRequest = {
						query: { limit: 'invalid-number' },
						route: '/api/data',
						params: {},
					} as unknown as IRequest
					const queryValidator = T.object({
						limit: T.number,
					})

					// This will throw a StatusError with 400 status
					parseRequestQuery(mockRequest, queryValidator)

					return Response.json({ success: true })
				})

				const request = new Request('https://api.example.com/api/data?limit=invalid')
				const env: SentryEnvironment = {}
				const ctx: ExecutionContext = {
					waitUntil: vi.fn(),
					passThroughOnException: vi.fn(),
					props: {},
				} as any

				const result = await handleApiRequest({
					router,
					request,
					env,
					ctx,
					after: (response) => response,
				})

				expect(result.status).toBe(400)
				const body = (await result.json()) as { error: string }
				expect(body.error).toMatch(/Query parameters:/)
			})

			it('handles complete error scenarios with Sentry integration', async () => {
				const router = createRouter()

				vi.spyOn(router, 'fetch').mockImplementation(async () => {
					throw new Error('Database connection failed')
				})

				const mockSentryInstance = { captureException: vi.fn() }
				vi.mocked(createSentry).mockReturnValue(mockSentryInstance as any)

				const request = new Request('https://api.example.com/api/data')
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://test@sentry.io/123',
					WORKER_NAME: 'test-worker',
					TLDRAW_ENV: 'production',
				}
				const ctx: ExecutionContext = {
					waitUntil: vi.fn(),
					passThroughOnException: vi.fn(),
					props: {},
				} as any

				const result = await handleApiRequest({
					router,
					request,
					env,
					ctx,
					after: (response) => {
						response.headers.set('X-Request-ID', 'test-request-123')
						return response
					},
				})

				expect(result.status).toBe(500)
				expect(result.headers.get('X-Request-ID')).toBe('test-request-123')
				expect(mockSentryInstance.captureException).toHaveBeenCalled()
			})
		})

		describe('CORS and middleware integration', () => {
			it('applies CORS headers through after function', async () => {
				const router = createRouter()
				const mockResponse = Response.json({ data: 'test' })
				vi.spyOn(router, 'fetch').mockResolvedValue(mockResponse)

				const corsAfter = (response: Response) => {
					response.headers.set('Access-Control-Allow-Origin', '*')
					response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
					response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
					return response
				}

				const result = await handleApiRequest({
					router,
					request: new Request('https://example.com/test'),
					env: {},
					ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as any,
					after: corsAfter,
				})

				expect(result.headers.get('Access-Control-Allow-Origin')).toBe('*')
				expect(result.headers.get('Access-Control-Allow-Methods')).toBe(
					'GET, POST, PUT, DELETE, OPTIONS'
				)
				expect(result.headers.get('Access-Control-Allow-Headers')).toBe(
					'Content-Type, Authorization'
				)
			})

			it('applies rate limiting headers through after function', async () => {
				const router = createRouter()
				const mockResponse = Response.json({ data: 'test' })
				vi.spyOn(router, 'fetch').mockResolvedValue(mockResponse)

				const rateLimitAfter = (response: Response) => {
					response.headers.set('X-RateLimit-Limit', '100')
					response.headers.set('X-RateLimit-Remaining', '99')
					response.headers.set('X-RateLimit-Reset', '3600')
					return response
				}

				const result = await handleApiRequest({
					router,
					request: new Request('https://example.com/test'),
					env: {},
					ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as any,
					after: rateLimitAfter,
				})

				expect(result.headers.get('X-RateLimit-Limit')).toBe('100')
				expect(result.headers.get('X-RateLimit-Remaining')).toBe('99')
				expect(result.headers.get('X-RateLimit-Reset')).toBe('3600')
			})

			it('applies security headers through after function', async () => {
				const router = createRouter()
				const mockResponse = Response.json({ data: 'test' })
				vi.spyOn(router, 'fetch').mockResolvedValue(mockResponse)

				const securityAfter = (response: Response) => {
					response.headers.set('X-Content-Type-Options', 'nosniff')
					response.headers.set('X-Frame-Options', 'DENY')
					response.headers.set('X-XSS-Protection', '1; mode=block')
					response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
					return response
				}

				const result = await handleApiRequest({
					router,
					request: new Request('https://example.com/test'),
					env: {},
					ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as any,
					after: securityAfter,
				})

				expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff')
				expect(result.headers.get('X-Frame-Options')).toBe('DENY')
				expect(result.headers.get('X-XSS-Protection')).toBe('1; mode=block')
				expect(result.headers.get('Strict-Transport-Security')).toBe(
					'max-age=31536000; includeSubDomains'
				)
			})
		})

		describe('complex validation scenarios', () => {
			it('handles multi-step validation in query and body', async () => {
				const router = createRouter()

				vi.spyOn(router, 'fetch').mockImplementation(async (request) => {
					// Mock both query and body validation
					const mockRequest = {
						query: { format: 'json', version: 'v1' },
						route: '/api/process',
						params: {},
						json: async () => ({
							data: [{ id: 1, name: 'Test' }],
							metadata: { source: 'api' },
						}),
					} as unknown as IRequest

					// Validate query parameters
					const queryValidator = T.object({
						format: T.literalEnum('json', 'xml'),
						version: T.string,
					})
					const queryParams = parseRequestQuery(mockRequest, queryValidator)

					// Validate request body
					const bodyValidator = T.object({
						data: T.arrayOf(
							T.object({
								id: T.number,
								name: T.string,
							})
						),
						metadata: T.object({
							source: T.string,
						}),
					})
					const bodyData = await parseRequestBody(mockRequest, bodyValidator)

					return Response.json({
						processedData: bodyData.data,
						format: queryParams.format,
						version: queryParams.version,
						source: bodyData.metadata.source,
					})
				})

				const result = await handleApiRequest({
					router,
					request: new Request('https://example.com/test'),
					env: {},
					ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as any,
					after: (response) => response,
				})

				expect(result.status).toBe(200)
				const body = (await result.json()) as any
				expect(body.format).toBe('json')
				expect(body.version).toBe('v1')
				expect(body.source).toBe('api')
				expect(body.processedData).toEqual([{ id: 1, name: 'Test' }])
			})

			it('handles validation errors at different stages', async () => {
				const router = createRouter()

				// Test query validation error
				vi.spyOn(router, 'fetch').mockImplementation(async () => {
					const mockRequest = {
						query: { page: 'invalid' },
						route: '/api/test',
						params: {},
					} as unknown as IRequest
					const queryValidator = T.object({
						page: T.number,
					})

					parseRequestQuery(mockRequest, queryValidator) // This will throw
					return Response.json({ success: true })
				})

				const result1 = await handleApiRequest({
					router,
					request: new Request('https://example.com/test'),
					env: {},
					ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as any,
					after: (response) => response,
				})

				expect(result1.status).toBe(400)
				const body1 = (await result1.json()) as { error: string }
				expect(body1.error).toMatch(/Query parameters:/)

				// Test body validation error
				vi.mocked(router.fetch).mockImplementation(async () => {
					const mockRequest = {
						json: async () => ({ age: 'not-a-number' }),
					} as unknown as IRequest
					const bodyValidator = T.object({
						age: T.number,
					})

					await parseRequestBody(mockRequest, bodyValidator) // This will throw
					return Response.json({ success: true })
				})

				const result2 = await handleApiRequest({
					router,
					request: new Request('https://example.com/test'),
					env: {},
					ctx: { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as any,
					after: (response) => response,
				})

				expect(result2.status).toBe(400)
				const body2 = (await result2.json()) as { error: string }
				expect(body2.error).toMatch(/Body:/)
			})
		})
	})
})
