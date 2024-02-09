import { MigrationSequence } from '@tldraw/store'
import { InitialMigration } from './000_InitialMigration'

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
