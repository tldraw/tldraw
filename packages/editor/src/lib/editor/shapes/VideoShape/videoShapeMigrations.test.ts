import { videoShapeMigrations } from './videoShapeMigrations'

describe('Adding url props', () => {
	for (const [name, { up, down }] of [
		['video shape', videoShapeMigrations.migrators[1]],
	] as const) {
		test(`${name}: up works as expected`, () => {
			const before = { props: {} }
			const after = { props: { url: '' } }
			expect(up(before)).toStrictEqual(after)
		})

		test(`${name}: down works as expected`, () => {
			const before = { props: { url: '' } }
			const after = { props: {} }
			expect(down(before)).toStrictEqual(after)
		})
	}
})
