import { T } from '@tldraw/validate'
import { IRequest, StatusError } from 'itty-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	handleApiRequest,
	parseRequestBody,
	parseRequestQuery,
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

		it('handles successful router response and applies after function', async () => {
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

		it('handles generic Error with 500 status and sends to Sentry', async () => {
			const genericError = new Error('Something went wrong')
			vi.mocked(mockRouter.fetch).mockRejectedValue(genericError)

			const mockSentryInstance = { captureException: vi.fn() }
			vi.mocked(createSentry).mockReturnValue(mockSentryInstance as any)

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
			expect(createSentry).toHaveBeenCalledWith(mockCtx, mockEnv, mockRequest)
			expect(mockSentryInstance.captureException).toHaveBeenCalledWith(genericError)
		})

		it('handles after function throwing error', async () => {
			const mockResponse = Response.json({ success: true })
			vi.mocked(mockRouter.fetch).mockResolvedValue(mockResponse)

			const afterError = new Error('After function failed')
			const failingAfter = vi.fn(() => {
				throw afterError
			})

			const mockSentryInstance = { captureException: vi.fn() }
			vi.mocked(createSentry).mockReturnValue(mockSentryInstance as any)

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
			expect(mockSentryInstance.captureException).toHaveBeenCalledWith(afterError)
		})
	})

	describe('parseRequestQuery', () => {
		let mockRequest: IRequest

		beforeEach(() => {
			mockRequest = {
				query: {},
			} as IRequest
		})

		it('parses valid query parameters', () => {
			const validator = T.object({
				name: T.string,
				age: T.string.optional(),
			})

			mockRequest.query = { name: 'John', age: '30' }

			const result = parseRequestQuery(mockRequest, validator)

			expect(result).toEqual({ name: 'John', age: '30' })
		})

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
	})

	describe('parseRequestBody', () => {
		let mockRequest: IRequest

		beforeEach(() => {
			mockRequest = {
				json: vi.fn(),
			} as any
		})

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
	})
})
