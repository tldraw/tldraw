import { readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { validateMigrationFilenames } from './validateMigrationFilenames'

const migrationsDir = fileURLToPath(new URL('./migrations', import.meta.url))

describe('validateMigrationFilenames', () => {
	it('passes for the migrations checked into this package', () => {
		const filenames = readdirSync(migrationsDir)
		expect(() => validateMigrationFilenames(filenames)).not.toThrow()
	})

	it('accepts a clean contiguous sequence', () => {
		expect(() =>
			validateMigrationFilenames(['000_seed.sql', '001_a.sql', '002_b.sql'])
		).not.toThrow()
	})

	it('throws on a duplicate number', () => {
		expect(() => validateMigrationFilenames(['000_seed.sql', '001_a.sql', '001_b.sql'])).toThrow(
			/Duplicate migration number 001/
		)
	})

	it('throws on a gap in the sequence', () => {
		expect(() => validateMigrationFilenames(['000_seed.sql', '002_b.sql'])).toThrow(/missing 001/)
	})

	it('throws when the sequence does not start at 000', () => {
		expect(() => validateMigrationFilenames(['001_a.sql'])).toThrow(/must start at 000/)
	})

	it('throws on a malformed filename', () => {
		expect(() => validateMigrationFilenames(['1_a.sql'])).toThrow(/must match/)
	})

	it('allows explicitly grandfathered duplicate numbers', () => {
		expect(() =>
			validateMigrationFilenames(['000_seed.sql', '001_a.sql', '001_b.sql'], new Set([1]))
		).not.toThrow()
	})
})
