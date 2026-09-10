import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { hasTransactionBlock, isNoTransactionMigration, splitSqlStatements } from './migrationFile'

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
	])('finds %s', (statement) => {
		expect(hasTransactionBlock(`ALTER TABLE foo DROP COLUMN bar;\n${statement}`)).toBe(true)
	})

	it('does not mistake a DO block or a plpgsql END for one', () => {
		expect(hasTransactionBlock(`DO $$\nBEGIN\n  RAISE NOTICE 'x';\nEND $$;`)).toBe(false)
		expect(hasTransactionBlock(`IF x THEN\n  y;\nEND IF;\nEND;`)).toBe(false)
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

describe('isNoTransactionMigration', () => {
	it('matches the marker on the first line', () => {
		expect(isNoTransactionMigration('-- no-transaction\nCREATE INDEX CONCURRENTLY x;')).toBe(true)
		expect(isNoTransactionMigration('--no-transaction\n')).toBe(true)
	})

	it('ignores the marker anywhere but the first line', () => {
		expect(isNoTransactionMigration('-- a header\n-- no-transaction\nSELECT 1;')).toBe(false)
	})

	it('is false for ordinary migrations', () => {
		expect(isNoTransactionMigration('CREATE TABLE t (id text);')).toBe(false)
		expect(isNoTransactionMigration('-- adds a table\nCREATE TABLE t (id text);')).toBe(false)
	})
})

describe('splitSqlStatements', () => {
	it('splits on top-level semicolons', () => {
		expect(splitSqlStatements('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2'])
	})

	it('keeps a leading comment with the statement it introduces', () => {
		expect(
			splitSqlStatements('-- why\nDROP INDEX CONCURRENTLY IF EXISTS "a";\nCREATE INDEX b;')
		).toEqual(['-- why\nDROP INDEX CONCURRENTLY IF EXISTS "a"', 'CREATE INDEX b'])
	})

	it('drops trailing content that is only comments or whitespace', () => {
		expect(splitSqlStatements('SELECT 1;\n-- trailing note\n')).toEqual(['SELECT 1'])
		expect(splitSqlStatements('-- nothing but a comment\n')).toEqual([])
	})

	it('ignores semicolons inside comments', () => {
		expect(splitSqlStatements('-- a; b\nSELECT 1;')).toEqual(['-- a; b\nSELECT 1'])
		expect(splitSqlStatements('/* a; /* nested; */ b */ SELECT 1;')).toEqual([
			'/* a; /* nested; */ b */ SELECT 1',
		])
	})

	it('ignores semicolons inside strings and quoted identifiers', () => {
		expect(splitSqlStatements(`SELECT ';'; SELECT 2;`)).toEqual([`SELECT ';'`, 'SELECT 2'])
		expect(splitSqlStatements(`SELECT '';`)).toEqual([`SELECT ''`])
		expect(splitSqlStatements(`SELECT 'it''s; fine';`)).toEqual([`SELECT 'it''s; fine'`])
		expect(splitSqlStatements(`CREATE INDEX "a;b" ON t (c);`)).toEqual([
			`CREATE INDEX "a;b" ON t (c)`,
		])
	})

	it('ignores semicolons inside dollar-quoted bodies', () => {
		const fn = `CREATE FUNCTION f() RETURNS void AS $$ BEGIN PERFORM 1; END $$ LANGUAGE plpgsql;`
		expect(splitSqlStatements(fn)).toEqual([fn.slice(0, -1)])
		const tagged = `DO $body$ SELECT 1; $body$;`
		expect(splitSqlStatements(tagged)).toEqual([tagged.slice(0, -1)])
	})

	it('treats a bare dollar as ordinary text', () => {
		expect(splitSqlStatements('SELECT $1;')).toEqual(['SELECT $1'])
	})
})
