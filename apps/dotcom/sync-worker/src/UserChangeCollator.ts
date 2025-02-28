import { ZReplicationChange } from './UserDataSyncer'

export class UserChangeCollator {
	readonly changes: Map<string, ZReplicationChange[]> = new Map()
	constructor() {}

	addChange(userId: string, change: ZReplicationChange) {
		let changes = this.changes.get(userId)
		if (!changes) {
			changes = []
			this.changes.set(userId, changes)
		}
		changes.push(change)
	}
}
