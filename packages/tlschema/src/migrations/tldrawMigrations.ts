import { MigrationSequence } from '@tldraw/store'
import { InitialMigration } from './000_InitialMigration'

export const tldrawMigrations = {
	id: 'com.tldraw',
	migrations: [InitialMigration],
} as const satisfies MigrationSequence
