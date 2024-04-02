import { StoreSchema } from '../StoreSchema'
import { Migrations } from '../migrate'

describe('dependsOn', () => {
	it('requires the depended on ids to be present', () => {
		expect(() => {
			StoreSchema.create(
				{},
				{
					migrations: [
						{
							sequenceId: 'foo',
							retroactive: false,
							sequence: [
								{
									id: 'foo/1',
									dependsOn: ['bar/1'],
									scope: 'record',
									up() {
										// noop
									},
								},
							],
						},
					],
				}
			)
		}).toThrowErrorMatchingInlineSnapshot(
			`"Migration 'foo/1' depends on missing migration 'bar/1'"`
		)
	})

	it('makes sure the migrations are sorted', () => {
		const foo: Migrations = {
			sequenceId: 'foo',
			retroactive: false,
			sequence: [
				{
					id: 'foo/1',
					dependsOn: ['bar/1'],
					scope: 'record',
					up() {
						// noop
					},
				},
			],
		}
		const bar: Migrations = {
			sequenceId: 'bar',
			retroactive: false,
			sequence: [
				{
					id: 'bar/1',
					scope: 'record',
					up() {
						// noop
					},
				},
			],
		}
		const s = StoreSchema.create(
			{},
			{
				migrations: [foo, bar],
			}
		)
		const s2 = StoreSchema.create(
			{},
			{
				migrations: [bar, foo],
			}
		)

		expect(s.sortedMigrations.map((s) => s.id)).toMatchInlineSnapshot(`
		[
		  "bar/1",
		  "foo/1",
		]
	`)
		expect(s2.sortedMigrations).toEqual(s.sortedMigrations)
	})
})
