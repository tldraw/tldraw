import { textShapeMigrations } from './textShapeMigrations'

describe('Removing align=justify from shape align props', () => {
	for (const [name, { up, down }] of [['text', textShapeMigrations.migrators[1]]] as const) {
		test(`${name}: up works as expected`, () => {
			expect(up({ props: { align: 'justify' } })).toEqual({
				props: { align: 'start' },
			})
			expect(up({ props: { align: 'end' } })).toEqual({
				props: { align: 'end' },
			})
		})

		test(`${name}: down works as expected`, () => {
			expect(down({ props: { align: 'start' } })).toEqual({
				props: { align: 'start' },
			})
		})
	}
})
