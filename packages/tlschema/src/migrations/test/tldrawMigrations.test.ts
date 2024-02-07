import { existsSync } from 'fs'
import { join } from 'path'
import { tldrawMigrations } from '../tldrawMigrations'

test('tldrawMigrations', () => {
	// It is EXTREMELY important that the order of the migrations is never changed after they have been run in production.
	// You can add to the end, but never remove or change the order of the migrations.
	expect(tldrawMigrations).toMatchInlineSnapshot(`
{
  "id": "com.tldraw",
  "migrations": [
    {
      "id": "com.tldraw/000_InitialMigration",
      "scope": "store",
      "up": [Function],
    },
  ],
}
`)
})

describe('each migration should be in a separate file', () => {
	const migrations = tldrawMigrations.migrations
	for (const migration of migrations) {
		const name = migration.id.split('/')[1]
		test(`src/migrations/${name}.ts should exist`, () => {
			expect(existsSync(join(__dirname, '..', name + '.ts'))).toBeTruthy()
		})
	}
})
