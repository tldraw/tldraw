import { validateMigrations } from '../migrate'

describe(validateMigrations, () => {
	// Note: Core validateMigrations functionality is thoroughly tested in migrate.test.ts
	// This file only contains additional edge cases not covered there

	it('should handle empty sequences', () => {
		expect(() =>
			validateMigrations({
				retroactive: false,
				sequence: [],
				sequenceId: 'foo',
			})
		).not.toThrow()
	})
})
