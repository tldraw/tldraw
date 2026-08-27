import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { hasTransactionBlock } from './migrationSql'

// migrate.ts rejects a migration that opens its own transaction, but it only finds out at deploy
// time, against a real database. The integration suites do not cover it either: they apply
// migration files straight through `client.query(sql)`, bypassing the runner, and they skip
// entirely without ZERO_CACHE_TEST_POSTGRES_URL — which is how CI runs them. So a migration
// carrying a BEGIN/COMMIT reached review green.
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

describe('hasTransactionBlock', () => {
	it('finds a transaction block', () => {
		expect(hasTransactionBlock('BEGIN;\nALTER TABLE foo DROP COLUMN bar;\nCOMMIT;')).toBe(true)
	})

	// The reason the check is punctuation-sensitive rather than word-based: every plpgsql function
	// body opens with a bare BEGIN, so a word-based check would reject most trigger migrations.
	it('does not mistake a plpgsql function body for one', () => {
		expect(
			hasTransactionBlock(
				`CREATE OR REPLACE FUNCTION f() RETURNS trigger AS $$\nBEGIN\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;`
			)
		).toBe(false)
	})
})

describe('the migrations checked into this package', () => {
	const filenames = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))

	it.each(filenames)('%s opens no transaction of its own', (filename) => {
		const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
		expect(hasTransactionBlock(sql)).toBe(false)
	})
})
