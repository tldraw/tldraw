import { SerializedSchemaV2, StoreSchema } from '../StoreSchema'
import { MigrationSequence } from '../migrate'

const mockSequence = ({
	id,
	retroactive,
	versions,
}: {
	id: string
	retroactive: boolean
	versions: number
}) =>
	({
		sequenceId: id,
		retroactive,
		sequence: new Array(versions).fill(0).map((_, i) => ({
			id: `${id}/${i + 1}`,
			scope: 'record',
			up() {
				// noop
			},
		})),
	}) satisfies MigrationSequence

function getMigrationsBetween(
	serialized: SerializedSchemaV2['sequences'],
	current: MigrationSequence[]
) {
	const schema = StoreSchema.create({}, { migrations: current })
	const ms = schema.getMigrationsSince({ schemaVersion: 2, sequences: serialized })
	if (!ms.ok) {
		throw new Error('Expected migrations to be found')
	}
	return ms.value.map((m) => m.id)
}

describe('getMigrationsSince', () => {
	it('includes migrations from new migration sequences with retroactive: true', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: true, versions: 3 })

		const ids = getMigrationsBetween({}, [foo, bar])
		const foos = ids.filter((id) => id.startsWith('foo'))
		const bars = ids.filter((id) => id.startsWith('bar'))

		expect(foos).toEqual(['foo/1', 'foo/2'])
		expect(bars).toEqual(['bar/1', 'bar/2', 'bar/3'])
	})

	it('does not include migrations from new migration sequences with retroactive: false', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })

		const ids = getMigrationsBetween({}, [foo, bar])
		const foos = ids.filter((id) => id.startsWith('foo'))
		const bars = ids.filter((id) => id.startsWith('bar'))

		expect(foos).toEqual(['foo/1', 'foo/2'])
		expect(bars).toEqual([])
	})

	it('returns the empty array if there are no overlapping sequences and new ones are retroactive: false', () => {
		const foo = mockSequence({ id: 'foo', retroactive: false, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })

		const ids = getMigrationsBetween({}, [foo, bar])
		expect(ids).toEqual([])
	})

	it('if a sequence is present both before and now, unapplied migrations will be returned', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const ids = getMigrationsBetween({ foo: 1, bar: 1 }, [foo, bar])

		const foos = ids.filter((id) => id.startsWith('foo'))
		const bars = ids.filter((id) => id.startsWith('bar'))

		expect(foos).toEqual(['foo/2'])
		expect(bars).toEqual(['bar/2', 'bar/3'])
	})

	it('if a sequence has not changed the empty array will be returned', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })
		const ids = getMigrationsBetween({ foo: 2, bar: 3 }, [foo, bar])

		expect(ids).toEqual([])
	})

	it('if a sequence starts with 0 all unapplied migrations will be returned', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 2 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 3 })

		const ids = getMigrationsBetween(
			{
				foo: 0,
				bar: 0,
			},
			[foo, bar]
		)
		const foos = ids.filter((id) => id.startsWith('foo'))
		const bars = ids.filter((id) => id.startsWith('bar'))

		expect(foos).toEqual(['foo/1', 'foo/2'])
		expect(bars).toEqual(['bar/1', 'bar/2', 'bar/3'])
	})

	it('if a sequence starts with 0 and has 0 new migrations, no migrations will be returned', () => {
		const foo = mockSequence({ id: 'foo', retroactive: true, versions: 0 })
		const bar = mockSequence({ id: 'bar', retroactive: false, versions: 0 })

		const ids = getMigrationsBetween(
			{
				foo: 0,
				bar: 0,
			},
			[foo, bar]
		)
		expect(ids).toEqual([])
	})
})
