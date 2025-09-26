import { describe, expect, it } from 'vitest'
import { forbidden, notFound } from './errors'

describe('errors', () => {
	describe('notFound', () => {
		it('returns 404 status with correct error message', async () => {
			const response = notFound()
			const body = await response.json()

			expect(response.status).toBe(404)
			expect(body).toEqual({ error: 'Not found' })
		})
	})

	describe('forbidden', () => {
		it('returns 403 status with correct error message', async () => {
			const response = forbidden()
			const body = await response.json()

			expect(response.status).toBe(403)
			expect(body).toEqual({ error: 'Forbidden' })
		})
	})
})
