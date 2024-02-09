import { Migration } from '@tldraw/store'

export const InitialMigration = {
	id: 'com.tldraw/000_InitialMigration',
	scope: 'store',
	up: (_data) => {
		// no-op to get the ball rolling
	},
} as const satisfies Migration
