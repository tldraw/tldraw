import { describe, expect, it } from 'vitest'
import { scribbleValidator, TL_SCRIBBLE_STATES, TLScribble } from './TLScribble'

describe('TLScribble', () => {
	describe('TL_SCRIBBLE_STATES', () => {
		it('should contain the expected scribble states', () => {
			const expectedStates = ['starting', 'paused', 'active', 'stopping']
			expect(Array.from(TL_SCRIBBLE_STATES).sort()).toEqual(expectedStates.sort())
		})
	})

	describe('scribbleValidator', () => {
		it('should validate a valid scribble object', () => {
			const validScribble: TLScribble = {
				id: 'scribble-123',
				points: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 10, y: 5, z: 0.7 },
				],
				size: 4,
				color: 'black',
				opacity: 0.8,
				state: 'active',
				delay: 0,
				shrink: 0.1,
				taper: true,
			}

			expect(() => scribbleValidator.validate(validScribble)).not.toThrow()
			expect(scribbleValidator.validate(validScribble)).toEqual(validScribble)
		})

		it('should reject invalid inputs', () => {
			// Missing required properties
			expect(() => scribbleValidator.validate({})).toThrow()

			// Invalid types
			expect(() =>
				scribbleValidator.validate({
					id: 123, // not string
					points: [{ x: 0, y: 0 }],
					size: 2,
					color: 'black',
					opacity: 1,
					state: 'active',
					delay: 0,
					shrink: 0,
					taper: false,
				})
			).toThrow()

			// Invalid size (negative)
			expect(() =>
				scribbleValidator.validate({
					id: 'test',
					points: [{ x: 0, y: 0 }],
					size: -1,
					color: 'black',
					opacity: 1,
					state: 'active',
					delay: 0,
					shrink: 0,
					taper: false,
				})
			).toThrow()

			// Invalid color
			expect(() =>
				scribbleValidator.validate({
					id: 'test',
					points: [{ x: 0, y: 0 }],
					size: 2,
					color: 'invalid-color',
					opacity: 1,
					state: 'active',
					delay: 0,
					shrink: 0,
					taper: false,
				})
			).toThrow()

			// Invalid state
			expect(() =>
				scribbleValidator.validate({
					id: 'test',
					points: [{ x: 0, y: 0 }],
					size: 2,
					color: 'black',
					opacity: 1,
					state: 'invalid-state',
					delay: 0,
					shrink: 0,
					taper: false,
				})
			).toThrow()
		})

		it('should return true for valid objects and false for invalid ones with isValid', () => {
			const validScribble: TLScribble = {
				id: 'test',
				points: [{ x: 0, y: 0 }],
				size: 2,
				color: 'black',
				opacity: 1,
				state: 'active',
				delay: 0,
				shrink: 0,
				taper: false,
			}

			expect(scribbleValidator.isValid(validScribble)).toBe(true)
			expect(scribbleValidator.isValid({})).toBe(false)
			expect(scribbleValidator.isValid(null)).toBe(false)
			expect(() => scribbleValidator.isValid(validScribble)).not.toThrow()
		})
	})
})
