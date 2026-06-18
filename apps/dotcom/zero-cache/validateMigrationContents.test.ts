import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { validateMigrationContents } from './validateMigrationContents'

const migrationsDir = fileURLToPath(new URL('./migrations', import.meta.url))

function readMigrations() {
	return readdirSync(migrationsDir)
		.filter((filename) => filename.endsWith('.sql'))
		.map((filename) => ({
			filename,
			sql: readFileSync(`${migrationsDir}/${filename}`, 'utf8'),
		}))
}

const bad = 'ALTER TABLE "group" ADD COLUMN "x" boolean NOT NULL DEFAULT true;'

describe('validateMigrationContents', () => {
	it('passes for the migrations checked into this package', () => {
		expect(() => validateMigrationContents(readMigrations())).not.toThrow()
	})

	it('throws on a new migration that adds a column with a DEFAULT', () => {
		expect(() => validateMigrationContents([{ filename: '999_bad.sql', sql: bad }])).toThrow(
			/adds a column with a DEFAULT/
		)
	})

	it('throws on the multi-line ADD COLUMN ... DEFAULT shape (as real migration 037 used)', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_multiline.sql',
					sql: 'ALTER TABLE "group"\nADD COLUMN "x" BOOLEAN NOT NULL DEFAULT true;',
				},
			])
		).toThrow(/adds a column with a DEFAULT/)
	})

	it('throws when COLUMN is omitted (ADD <name> ... DEFAULT)', () => {
		expect(() =>
			validateMigrationContents([
				{ filename: '999_nocolumn.sql', sql: 'ALTER TABLE "group" ADD "x" boolean DEFAULT true;' },
			])
		).toThrow(/adds a column with a DEFAULT/)
	})

	it('is case-insensitive', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_lower.sql',
					sql: 'alter table "group" add column "x" boolean default true;',
				},
			])
		).toThrow(/adds a column with a DEFAULT/)
	})

	it('names the offending migration when it is among several', () => {
		expect(() =>
			validateMigrationContents([
				{ filename: '998_ok.sql', sql: 'ALTER TABLE "group" ADD COLUMN "a" boolean;' },
				{ filename: '999_bad.sql', sql: bad },
			])
		).toThrow(/999_bad\.sql/)
	})

	it('allows the expand step: a nullable column with no default', () => {
		expect(() =>
			validateMigrationContents([
				{ filename: '999_expand.sql', sql: 'ALTER TABLE "group" ADD COLUMN "x" boolean;' },
			])
		).not.toThrow()
	})

	it('allows a separate ADD and SET DEFAULT in one migration (semicolon boundary)', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_expand_then_default.sql',
					sql:
						'ALTER TABLE "group" ADD COLUMN "x" boolean;\n' +
						'ALTER TABLE "group" ALTER COLUMN "x" SET DEFAULT true;',
				},
			])
		).not.toThrow()
	})

	it('allows the contract steps: setting default / not null on an existing column', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_contract.sql',
					sql:
						'ALTER TABLE "group" ALTER COLUMN "x" SET DEFAULT true;\n' +
						'ALTER TABLE "group" ALTER COLUMN "x" SET NOT NULL;',
				},
			])
		).not.toThrow()
	})

	it('ignores the pattern in a line comment', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_line_comment.sql',
					sql:
						'-- deliberately NOT using ADD COLUMN ... DEFAULT here\n' +
						'ALTER TABLE "group" ADD COLUMN "x" boolean;',
				},
			])
		).not.toThrow()
	})

	it('ignores the pattern in a block comment', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_block_comment.sql',
					sql:
						'/* historically this was\n   ADD COLUMN "x" boolean DEFAULT true; */\n' +
						'ALTER TABLE "group" ADD COLUMN "x" boolean;',
				},
			])
		).not.toThrow()
	})

	it('lets a migration opt out for a table Zero does not replicate', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_optout.sql',
					sql:
						'-- zero-cache:allow-add-column-default paddle_transactions is not replicated\n' +
						'ALTER TABLE "paddle_transactions" ADD COLUMN "x" int NOT NULL DEFAULT 0;',
				},
			])
		).not.toThrow()
	})

	it('requires a reason on the opt-out marker', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_optout_noreason.sql',
					sql: '-- zero-cache:allow-add-column-default\n' + bad,
				},
			])
		).toThrow(/adds a column with a DEFAULT/)
	})

	it('does not treat the marker as an opt-out unless it is a line comment', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_optout_notcomment.sql',
					sql:
						`INSERT INTO log (note) VALUES ('zero-cache:allow-add-column-default here');\n` + bad,
				},
			])
		).toThrow(/adds a column with a DEFAULT/)
	})

	it('inspects a .sql file even when its name is malformed', () => {
		expect(() => validateMigrationContents([{ filename: 'weird.sql', sql: bad }])).toThrow(
			/adds a column with a DEFAULT/
		)
	})

	it('skips non-.sql files', () => {
		expect(() => validateMigrationContents([{ filename: 'README.md', sql: bad }])).not.toThrow()
	})

	it('allows a grandfathered migration to use a default (default set)', () => {
		expect(() =>
			validateMigrationContents([{ filename: '006_add_file_soft_delete.sql', sql: bad }])
		).not.toThrow()
	})

	it('allows a grandfathered migration via an explicit set', () => {
		expect(() =>
			validateMigrationContents([{ filename: '999_x.sql', sql: bad }], new Set(['999_x.sql']))
		).not.toThrow()
	})
})
