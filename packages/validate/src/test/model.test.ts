import * as T from '../lib/validation'

describe('§14 Models', () => {
	it('[M1] model prefixes the model name onto validation failures', () => {
		const shape = T.model('shape', T.object({ id: T.string, x: T.number, y: T.number }))

		const value = { id: 'abc123', x: 132, y: 0 }
		expect(shape.validate(value)).toBe(value)

		expect(() => shape.validate({ id: 'abc123', x: 132, y: NaN })).toThrow(
			'At shape.y: Expected a number, got NaN'
		)
		expect(() =>
			T.model(
				'shape',
				T.object({ id: T.string, color: T.setEnum(new Set(['red', 'green', 'blue'])) })
			).validate({ id: 'abc13', color: 'rubbish' })
		).toThrow('At shape.color: Expected "red" or "green" or "blue", got rubbish')
	})

	it('[M2] known-good validation delegates to the inner validator with the same prefixing', () => {
		const user = T.model('user', T.object({ id: T.string, n: T.number }))
		const knownGood = user.validate({ id: 'x', n: 1 })

		expect(user.validateUsingKnownGoodVersion(knownGood, { id: 'x', n: 1 })).toBe(knownGood)

		const next = { id: 'x', n: 2 }
		expect(user.validateUsingKnownGoodVersion(knownGood, next)).toBe(next)

		expect(() => user.validateUsingKnownGoodVersion(knownGood, { id: 'x', n: 'bad' })).toThrow(
			'At user.n: Expected number, got a string'
		)
	})
})
