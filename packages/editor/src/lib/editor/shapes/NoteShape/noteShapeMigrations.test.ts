import { noteShapeMigrations } from './noteShapeMigrations'

describe('Adding url props', () => {
	for (const [name, { up, down }] of [['note shape', noteShapeMigrations.migrators[1]]] as const) {
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

describe('Removing align=justify from shape align props', () => {
	for (const [name, { up, down }] of [['note', noteShapeMigrations.migrators[2]]] as const) {
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

describe('Migrate NoteShape legacy horizontal alignment', () => {
	const { up, down } = noteShapeMigrations.migrators[3]

	test('up works as expected', () => {
		expect(up({ props: { align: 'start', color: 'red' } })).toEqual({
			props: { align: 'start-legacy', color: 'red' },
		})
		expect(up({ props: { align: 'middle', color: 'red' } })).toEqual({
			props: { align: 'middle-legacy', color: 'red' },
		})
		expect(up({ props: { align: 'end', color: 'red' } })).toEqual({
			props: { align: 'end-legacy', color: 'red' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { align: 'start-legacy', color: 'red' } })).toEqual({
			props: { align: 'start', color: 'red' },
		})
		expect(down({ props: { align: 'middle-legacy', color: 'red' } })).toEqual({
			props: { align: 'middle', color: 'red' },
		})
		expect(down({ props: { align: 'end-legacy', color: 'red' } })).toEqual({
			props: { align: 'end', color: 'red' },
		})
	})
})

describe('Adds NoteShape vertical alignment', () => {
	const { up, down } = noteShapeMigrations.migrators[4]

	test('up works as expected', () => {
		expect(up({ props: { color: 'red' } })).toEqual({
			props: { verticalAlign: 'middle', color: 'red' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { verticalAlign: 'top', color: 'red' } })).toEqual({
			props: { color: 'red' },
		})
	})
})
