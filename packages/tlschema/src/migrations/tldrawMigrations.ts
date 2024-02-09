import { MigrationSequence } from '@tldraw/store'
import { InitialMigration } from './000_InitialMigration'

// 💡❗ Before updating this file make sure you have read the
// 💡❗ section on migrations in the tlschema README.md file.

/**
 * @public
 */
export const tldrawMigrations = {
	id: 'com.tldraw',
	migrations: [
		// New migrations must be appended AT THE END OF THIS ARRAY ONLY.
		InitialMigration,
	],
} as const satisfies MigrationSequence
