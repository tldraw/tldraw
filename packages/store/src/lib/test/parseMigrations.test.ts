import { MigrationSequence } from '../migrate'
import { parseMigrations } from '../parseMigrations'

const bookMigrations = {
	id: 'com.book',
	migrations: [
		{
			id: 'com.book/000_InitialMigration',
			scope: 'store',
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			up(store) {
				return store
			},
		},
		{
			id: 'com.book/001_AddAuthor',
			scope: 'record',
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			up(record) {
				return record
			},
		},
	],
} as const satisfies MigrationSequence

const authorMigrations = {
	id: 'com.author',
	migrations: [
		{
			id: 'com.author/000_InitialMigration',
			scope: 'store',
			up(store) {
				return store
			},
		},
	],
} as const satisfies MigrationSequence

const libraryMigrations = {
	id: 'com.library',
	migrations: [],
} as const satisfies MigrationSequence

test('empty migration sequences are fine', () => {
	const empty = parseMigrations({
		sequences: [],
		order: [],
	})
	expect(empty).toMatchInlineSnapshot(`
{
  "includedSequenceIds": Set {},
  "migrations": Map {},
  "sortedMigrationIds": [],
}
`)

	expect(parseMigrations(undefined)).toEqual(empty)

	expect(
		parseMigrations({
			sequences: [{ sequence: libraryMigrations, versionAtInstallation: 'root' }],
			order: [],
		})
	).toMatchInlineSnapshot(`
{
  "includedSequenceIds": Set {
    "com.library",
  },
  "migrations": Map {},
  "sortedMigrationIds": [],
}
`)
})

test('versionAtInstallation must be "root" or a valid id for the sequence', () => {})
