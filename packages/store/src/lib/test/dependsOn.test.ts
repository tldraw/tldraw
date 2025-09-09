import { StoreSchema } from '../StoreSchema'
import { MigrationSequence, createMigrationSequence } from '../migrate'

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
			`[Error: Migration 'foo/1' depends on missing migration 'bar/1']`
		)
	})

	it('makes sure the migrations are sorted', () => {
		const foo: MigrationSequence = {
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
		const bar: MigrationSequence = {
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

describe('standalone dependsOn', () => {
	it('requires the depended on ids to be present', () => {
		expect(() => {
			StoreSchema.create(
				{},
				{
					migrations: [
						createMigrationSequence({
							sequenceId: 'foo',
							retroactive: false,
							sequence: [
								{
									dependsOn: ['bar/1'],
								},
								{
									id: 'foo/1',
									scope: 'record',
									up() {
										// noop
									},
								},
							],
						}),
					],
				}
			)
		}).toThrowErrorMatchingInlineSnapshot(
			`[Error: Migration 'foo/1' depends on missing migration 'bar/1']`
		)
	})

	it('makes sure the migrations are sorted', () => {
		const foo: MigrationSequence = createMigrationSequence({
			sequenceId: 'foo',
			retroactive: false,
			sequence: [
				{
					dependsOn: ['bar/1'],
				},
				{
					id: 'foo/1',
					scope: 'record',
					up() {
						// noop
					},
				},
			],
		})
		const bar: MigrationSequence = createMigrationSequence({
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
		})
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
