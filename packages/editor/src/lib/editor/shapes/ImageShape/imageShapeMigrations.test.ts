import { imageShapeMigrations } from './imageShapeMigrations'

describe('Adding url props', () => {
	for (const [name, { up, down }] of [
		['image shape', imageShapeMigrations.migrators[1]],
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

describe('Add crop=null to image shapes', () => {
	const { up, down } = imageShapeMigrations.migrators[2]
	test('up works as expected', () => {
		expect(up({ props: { w: 100 } })).toEqual({
			props: { w: 100, crop: null },
		})
	})

	test('down works as expected', () => {
		expect(down({ props: { w: 100, crop: null } })).toEqual({
			props: { w: 100 },
		})
	})
})
