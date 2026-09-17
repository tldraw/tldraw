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

	// A lowercase or long-form commit is the dangerous one: it ends the runner's transaction
	// silently, so a dry run applies everything after it for real.
	it.each([
		'commit;',
		'COMMIT WORK;',
		'COMMIT TRANSACTION;',
		'ROLLBACK;',
		'START TRANSACTION;',
		'BEGIN TRANSACTION;',
		'END TRANSACTION;',
		'begin ;',
		// Postgres accepts END and END WORK as synonyms for COMMIT.
		'END;',
		'END WORK;',
		'end ;',
	])('finds %s', (statement) => {
		expect(hasTransactionBlock(`ALTER TABLE foo DROP COLUMN bar;\n${statement}`)).toBe(true)
	})

	it('finds a COMMIT after a function definition', () => {
		expect(
			hasTransactionBlock(
				`CREATE FUNCTION f() RETURNS trigger AS $$\nBEGIN\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;\nCOMMIT;`
			)
		).toBe(true)
	})

	it('does not mistake a DO block or a plpgsql END for one', () => {
		expect(hasTransactionBlock(`DO $$\nBEGIN\n  RAISE NOTICE 'x';\nEND $$;`)).toBe(false)
		expect(hasTransactionBlock(`DO $$\nBEGIN\n  IF x THEN\n    y;\n  END IF;\nEND;\n$$;`)).toBe(
			false
		)
	})

	it('does not mistake an END inside a tagged dollar quote for one', () => {
		expect(
			hasTransactionBlock(
				`CREATE FUNCTION f() RETURNS trigger AS $body$\nBEGIN\n  PERFORM 1;\nEND;\n$body$ LANGUAGE plpgsql;`
			)
		).toBe(false)
	})

	// Neither is a statement, so neither can end the runner's transaction.
	it.each([
		[
			'a line comment',
			`ALTER TABLE foo DROP COLUMN bar; -- END;\nALTER TABLE foo DROP COLUMN baz;`,
		],
		['a line comment', `-- run COMMIT; by hand afterwards\nALTER TABLE foo DROP COLUMN bar;`],
		['a block comment', `/* END;\n COMMIT; */\nALTER TABLE foo DROP COLUMN bar;`],
		['a nested block comment', `/* outer /* END; */ COMMIT; */\nALTER TABLE foo DROP COLUMN bar;`],
		['a string literal', `INSERT INTO foo (bar) VALUES ('END;');`],
		['a string literal', `INSERT INTO foo (bar) VALUES ('COMMIT;');`],
		['a string literal with an escaped quote', `INSERT INTO foo (bar) VALUES ('it''s; END;');`],
		['an escape string', `INSERT INTO foo (bar) VALUES (E'it\\'s; COMMIT;');`],
	])('ignores a transaction keyword inside %s', (_, sql) => {
		expect(hasTransactionBlock(sql)).toBe(false)
	})

	it('still finds a statement next to a comment or string', () => {
		expect(hasTransactionBlock(`INSERT INTO foo (bar) VALUES ('x'); -- done\nCOMMIT;`)).toBe(true)
		expect(hasTransactionBlock(`/* wrap up */ END /* now */;`)).toBe(true)
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
