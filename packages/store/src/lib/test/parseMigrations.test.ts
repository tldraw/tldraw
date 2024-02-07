import { MigrationId, MigrationSequence, MigrationsConfigBuilder } from '../migrate'
import { parseMigrations } from '../parseMigrations'

function migration<Id extends MigrationId>(id: Id) {
	return {
		id,
		scope: 'record',
		up(record: any) {
			return record
		},
	} as const
}

const bookMigrations = {
	id: 'com.book',
	migrations: [
		migration('com.book/000_InitialMigration'),
		migration('com.book/001_AddAuthor'),
		migration('com.book/002_FixTitle'),
		migration('com.book/003_MoreStuff'),
	],
} as const satisfies MigrationSequence

const authorMigrations = {
	id: 'com.author',
	migrations: [migration('com.author/000_InitialMigration')],
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

test('versionAtInstallation must be a valid id for the sequence if not "root"', () => {
	expect(() =>
		parseMigrations({
			sequences: [
				{ sequence: authorMigrations, versionAtInstallation: 'com.book/000_InitialMigration' },
			],

			order: [],
		})
	).toThrowErrorMatchingInlineSnapshot(`
"[tldraw] The versionAtInstallation option specified for the "com.author" migration sequence is invalid.
				
"com.book/000_InitialMigration" does not match one of the migrations in the sequence.
				
Use either "root" or one of the following migration ids: [
  "com.author/000_InitialMigration"
]"
`)
})

test('migration ids must have the correct format', () => {
	const testId = (id: string) => {
		const migrations = {
			...bookMigrations,
			migrations: [...bookMigrations.migrations, migration(id as any)],
		}
		parseMigrations({
			sequences: [{ sequence: migrations, versionAtInstallation: 'root' }],
			order: migrations.migrations.map((m) => m.id),
		})
	}

	expect(() => testId('com.book/006_Whatever')).not.toThrow()
	expect(() => testId('com.author/006_Whatever')).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Migration id "com.author/006_Whatever" is incorrectly formatted. Ids must start with "com.book/"."`
	)
	expect(() => testId('com.bookok')).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Migration id "com.bookok" is incorrectly formatted. Ids must start with "com.book/"."`
	)
	expect(() => testId('')).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Migration id "" is incorrectly formatted. Ids must start with "com.book/"."`
	)
})

test('the order array may not reference unused migrations', () => {
	expect(() => {
		parseMigrations({
			sequences: [{ sequence: bookMigrations, versionAtInstallation: 'com.book/002_FixTitle' }],

			order: ['com.book/000_InitialMigration'],
		})
	}).toThrowErrorMatchingInlineSnapshot(`
"[tldraw] Your migration order array includes the migration "com.book/000_InitialMigration" which appears _before_ the specified 'versionAtInstallation' "com.book/002_FixTitle".
			
This is an error. Only migrations that appear _after_ the specified 'versionAtInstallation' should be included in the migration order array."
`)

	expect(() => {
		parseMigrations({
			sequences: [{ sequence: bookMigrations, versionAtInstallation: 'com.book/002_FixTitle' }],

			order: ['com.book/002_FixTitle'],
		})
	}).toThrowErrorMatchingInlineSnapshot(`
"[tldraw] Your migration order array includes the ID you specified as the versionAtInstallation for sequence "com.book". This is an error.
		
versionAtInstallation, in this case "com.book/002_FixTitle", should not appear in the migration order array, but any and all subsequent migration IDs should."
`)
})

test('the order array must be ordered correctly', () => {
	expect(() => {
		parseMigrations({
			sequences: [
				{ sequence: authorMigrations, versionAtInstallation: 'root' },
				{ sequence: bookMigrations, versionAtInstallation: bookMigrations.migrations[0].id },
			],

			order: [
				'com.author/000_InitialMigration',
				'com.book/002_FixTitle',
				'com.book/001_AddAuthor',
				'com.book/003_MoreStuff',
			],
		})
	}).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Migration id "com.book/002_FixTitle" is out of order. It should come after "com.book/001_AddAuthor""`
	)
})

test('any used migrations must be included in the order', () => {
	expect(() => {
		parseMigrations({
			sequences: [
				{ sequence: authorMigrations, versionAtInstallation: 'root' },
				{ sequence: bookMigrations, versionAtInstallation: bookMigrations.migrations[0].id },
			],

			order: ['com.author/000_InitialMigration'],
		})
	}).toThrowErrorMatchingInlineSnapshot(`
"[tldraw] Some migration IDs are missing from your migration order array. Did you just update a tldraw dependency?

Add the following IDs to the end of your existing migration order array: [
  "com.book/001_AddAuthor",
  "com.book/002_FixTitle",
  "com.book/003_MoreStuff"
]
"
`)
})

test('it complains if `order` mentions a migration that does not exist', () => {
	expect(() => {
		parseMigrations({
			sequences: [
				{ sequence: authorMigrations, versionAtInstallation: 'root' },
				{ sequence: bookMigrations, versionAtInstallation: bookMigrations.migrations[0].id },
			],

			order: [
				'com.author/000_InitialMigration',
				'com.book/001_AddAuthor',
				'com.book/002_FixTitle',
				'com.book/003_MoreStuff',
				'com.book/004_ThisDoesNotExist',
			],
		})
	}).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Your order array includes the migration ID "com.book/004_ThisDoesNotExist" but the sequence "com.book" does not include a migration with that ID."`
	)
	expect(() => {
		parseMigrations({
			sequences: [
				{ sequence: authorMigrations, versionAtInstallation: 'root' },
				{ sequence: bookMigrations, versionAtInstallation: bookMigrations.migrations[0].id },
			],

			order: [
				'com.author/000_InitialMigration',
				'com.book/001_AddAuthor',
				'com.book/002_FixTitle',
				'com.banana/001_ThisDoesNotExist',
				'com.book/003_MoreStuff',
			],
		})
	}).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Your order array includes the migration ID "com.banana/001_ThisDoesNotExist" but you did not provide a sequence with id "com.banana". Did you forget to add the migration sequence?"`
	)
})

test("it complains if a dependsOn referee's sequence was not provided", () => {
	const libraryMigrations = {
		id: 'com.library',
		migrations: [
			{
				id: 'com.library/000_InitialMigration',
				scope: 'record',
				up: (record: any) => record,
				dependsOn: ['com.book/001_AddAuthor'],
			},
		],
	} as const satisfies MigrationSequence
	expect(() =>
		parseMigrations({
			sequences: [
				{ sequence: authorMigrations, versionAtInstallation: 'root' },
				{ sequence: libraryMigrations, versionAtInstallation: 'root' },
			],

			order: ['com.author/000_InitialMigration', 'com.library/000_InitialMigration'],
		})
	).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Your order array includes the migration "com.library/000_InitialMigration" which depends on a migration with ID "com.book/001_AddAuthor" but you did not provide a sequence with id "com.book". Did you forget to add the migration sequence?"`
	)
})

test("it complains if a dependsOn referee was not given in it's sequence", () => {
	const libraryMigrations = {
		id: 'com.library',
		migrations: [
			{
				id: 'com.library/000_InitialMigration',
				scope: 'record',
				up: (record: any) => record,
				dependsOn: ['com.book/004_AddThings'],
			},
		],
	} as const satisfies MigrationSequence
	expect(() =>
		parseMigrations({
			sequences: [
				{ sequence: libraryMigrations, versionAtInstallation: 'root' },
				{ sequence: bookMigrations, versionAtInstallation: 'root' },
			],

			order: [
				'com.book/000_InitialMigration',
				'com.book/001_AddAuthor',
				'com.book/002_FixTitle',
				'com.book/003_MoreStuff',
				'com.library/000_InitialMigration',
			],
		})
	).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Your order array includes the migration "com.library/000_InitialMigration" which depends on a migration with ID "com.book/004_AddThings" but the sequence "com.book" does not include a migration with that ID. Do you need to update an npm dependency?"`
	)
})

test('it complains if a migration depends on itself', () => {
	const libraryMigrations = {
		id: 'com.library',
		migrations: [
			{
				id: 'com.library/000_InitialMigration',
				scope: 'record',
				up: (record: any) => record,
				dependsOn: ['com.library/000_InitialMigration'],
			},
		],
	} as const satisfies MigrationSequence
	expect(() =>
		parseMigrations({
			sequences: [{ sequence: libraryMigrations, versionAtInstallation: 'root' }],

			order: ['com.library/000_InitialMigration'],
		})
	).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Migration id "com.library/000_InitialMigration" depends on itself. This is not allowed."`
	)
})

test('it complains if a dependsOn referee was given out of order', () => {
	const libraryMigrations = {
		id: 'com.library',
		migrations: [
			{
				id: 'com.library/000_InitialMigration',
				scope: 'record',
				up: (record: any) => record,
				dependsOn: ['com.book/002_FixTitle'],
			},
		],
	} as const satisfies MigrationSequence
	expect(() =>
		parseMigrations({
			sequences: [
				{ sequence: libraryMigrations, versionAtInstallation: 'root' },
				{ sequence: bookMigrations, versionAtInstallation: 'root' },
			],

			order: [
				'com.book/000_InitialMigration',
				'com.book/001_AddAuthor',
				'com.library/000_InitialMigration',
				'com.book/002_FixTitle',
				'com.book/003_MoreStuff',
			],
		})
	).toThrowErrorMatchingInlineSnapshot(
		`"[tldraw] Migration id "com.book/002_FixTitle" is out of order. It should come after "com.library/000_InitialMigration""`
	)
})

test('it does not complain if a dependsOn referee was satisfied correctly', () => {
	const libraryMigrations = {
		id: 'com.library',
		migrations: [
			{
				id: 'com.library/000_InitialMigration',
				scope: 'record',
				up: (record: any) => record,
				dependsOn: ['com.book/002_FixTitle'],
			},
		],
	} as const satisfies MigrationSequence
	expect(
		parseMigrations({
			sequences: [
				{ sequence: libraryMigrations, versionAtInstallation: 'root' },
				{ sequence: bookMigrations, versionAtInstallation: 'root' },
			],

			order: [
				'com.book/000_InitialMigration',
				'com.book/001_AddAuthor',
				'com.book/002_FixTitle',
				'com.library/000_InitialMigration',
				'com.book/003_MoreStuff',
			],
		})
	).toMatchInlineSnapshot(`
{
  "includedSequenceIds": Set {
    "com.library",
    "com.book",
  },
  "migrations": Map {
    "com.library/000_InitialMigration" => {
      "dependsOn": [
        "com.book/002_FixTitle",
      ],
      "id": "com.library/000_InitialMigration",
      "scope": "record",
      "up": [Function],
    },
    "com.book/000_InitialMigration" => {
      "id": "com.book/000_InitialMigration",
      "scope": "record",
      "up": [Function],
    },
    "com.book/001_AddAuthor" => {
      "id": "com.book/001_AddAuthor",
      "scope": "record",
      "up": [Function],
    },
    "com.book/002_FixTitle" => {
      "id": "com.book/002_FixTitle",
      "scope": "record",
      "up": [Function],
    },
    "com.book/003_MoreStuff" => {
      "id": "com.book/003_MoreStuff",
      "scope": "record",
      "up": [Function],
    },
  },
  "sortedMigrationIds": [
    "com.book/000_InitialMigration",
    "com.book/001_AddAuthor",
    "com.book/002_FixTitle",
    "com.library/000_InitialMigration",
    "com.book/003_MoreStuff",
  ],
}
`)
})

test('we call parseMigrations during the migrations constructor', () => {
	expect(() => {
		new MigrationsConfigBuilder().addSequence(bookMigrations).setOrder([])
	}).toThrowErrorMatchingInlineSnapshot(`
"[tldraw] Some migration IDs are missing from your migration order array. Did you just update a tldraw dependency?

Add the following IDs to the end of your existing migration order array: [
  "com.book/000_InitialMigration",
  "com.book/001_AddAuthor",
  "com.book/002_FixTitle",
  "com.book/003_MoreStuff"
]
"
`)
})
