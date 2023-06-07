import { bookmarkShapeMigrations } from './bookmarkShapeMigrations'

describe('Bookmark null asset id', () => {
	const { up, down } = bookmarkShapeMigrations.migrators[1]
	test('up works as expected', () => {
		const before = { props: {} }
		const after = { props: { assetId: null } }
		expect(up(before)).toStrictEqual(after)
	})

	test('down works as expected', () => {
		const before = { props: { assetId: null } }
		const after = { props: {} }
		expect(down(before)).toStrictEqual(after)
	})
})
