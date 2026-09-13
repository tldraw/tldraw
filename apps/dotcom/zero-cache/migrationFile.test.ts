import { describe, expect, it } from 'vitest'
import { isNoTransactionMigration, splitSqlStatements } from './migrationFile'

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
