import { MigrationSequence } from '@tldraw/store'
import { InitialMigration } from './000_InitialMigration'

export const tldrawMigrations: MigrationSequence = {
	id: 'com.tldraw',
	migrations: [InitialMigration],
}
