import { Migration } from '@tldraw/store'

export const InitialMigration: Migration = {
	id: 'com.tldraw/000_InitialMigration',
	scope: 'store',
	up: (data) => {
		// noop to get the ball rolling
		return data
	},
}
