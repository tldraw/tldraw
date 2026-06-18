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

	it('allows the expand step: a nullable column with no default', () => {
		expect(() =>
			validateMigrationContents([
				{ filename: '999_expand.sql', sql: 'ALTER TABLE "group" ADD COLUMN "x" boolean;' },
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

	it('ignores the pattern when it only appears in a comment', () => {
		expect(() =>
			validateMigrationContents([
				{
					filename: '999_comment.sql',
					sql:
						'-- deliberately NOT using ADD COLUMN ... DEFAULT here\n' +
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

	it('still allows grandfathered migrations to use a default', () => {
		expect(() =>
			validateMigrationContents([{ filename: '037_x.sql', sql: bad }], new Set([37]))
		).not.toThrow()
	})
})
