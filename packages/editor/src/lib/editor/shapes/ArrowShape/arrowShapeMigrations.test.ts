import { arrowShapeMigrations } from './arrowShapeMigrations'

describe('Adding labelColor prop to geo / arrow shapes', () => {
	for (const [name, { up, down }] of [
		['arrow shape', arrowShapeMigrations.migrators[1]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { color: 'red' } })).toEqual({
				props: { color: 'red', labelColor: 'black' },
			})
		})

		test(`${name}: down works as expected`, () => {
			expect(down({ props: { color: 'red', labelColor: 'blue' } })).toEqual({
				props: { color: 'red' },
			})
		})
	}
})
