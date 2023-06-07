import { geoShapeMigrations } from './geoShapeMigrations'

describe('Adding url props', () => {
	for (const [name, { up, down }] of [['geo shape', geoShapeMigrations.migrators[1]]] as const) {
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

describe('Adding labelColor prop to geo / arrow shapes', () => {
	for (const [name, { up, down }] of [['geo shape', geoShapeMigrations.migrators[2]]] as const) {
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

describe('Removing align=justify from shape align props', () => {
	for (const [name, { up, down }] of [['geo', geoShapeMigrations.migrators[3]]] as const) {
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

describe('Adding check-box to geo shape', () => {
	const { up, down } = geoShapeMigrations.migrators[4]

	test('up works as expected', () => {
		expect(up({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
	})
	test('down works as expected', () => {
		expect(down({ props: { geo: 'rectangle' } })).toEqual({ props: { geo: 'rectangle' } })
		expect(down({ props: { geo: 'check-box' } })).toEqual({ props: { geo: 'rectangle' } })
	})
})

describe('Add verticalAlign to geo shape', () => {
	const { up, down } = geoShapeMigrations.migrators[5]

	test('up works as expected', () => {
		expect(up({ props: { type: 'ellipse' } })).toEqual({
			props: { type: 'ellipse', verticalAlign: 'middle' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { verticalAlign: 'middle', type: 'ellipse' } })).toEqual({
			props: { type: 'ellipse' },
		})
	})
})

describe('Migrate GeoShape legacy horizontal alignment', () => {
	const { up, down } = geoShapeMigrations.migrators[6]

	test('up works as expected', () => {
		expect(up({ props: { align: 'start', type: 'ellipse' } })).toEqual({
			props: { align: 'start-legacy', type: 'ellipse' },
		})
		expect(up({ props: { align: 'middle', type: 'ellipse' } })).toEqual({
			props: { align: 'middle-legacy', type: 'ellipse' },
		})
		expect(up({ props: { align: 'end', type: 'ellipse' } })).toEqual({
			props: { align: 'end-legacy', type: 'ellipse' },
		})
	})
	test('down works as expected', () => {
		expect(down({ props: { align: 'start-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'start', type: 'ellipse' },
		})
		expect(down({ props: { align: 'middle-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'middle', type: 'ellipse' },
		})
		expect(down({ props: { align: 'end-legacy', type: 'ellipse' } })).toEqual({
			props: { align: 'end', type: 'ellipse' },
		})
	})
})
