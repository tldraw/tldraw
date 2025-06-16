import { TlaFileState, TlaGroupFile, TlaGroupUser, TlaRow } from '@tldraw/dotcom-shared'
import { ReplicationEvent, Topic } from './replicatorTypes'

/**
 * Represents an operation to add or remove a subscription edge in the topic graph.
 * Used to track changes to the subscription relationships between topics.
 *
 * @property type - Whether this is adding or removing a subscription
 * @property fromTopic - The source topic that is subscribing
 * @property toTopic - The target topic being subscribed to
 */

export interface Subscription {
	fromTopic: Topic
	toTopic: Topic
}

export function serializeSubscriptions(ops: Subscription[]): string | null {
	if (ops.length === 0) {
		return null
	}
	// Format: "fromTopic\toTopic,fromTopic\toTopic"
	// Using backslash as separator since topics contain colons
	return ops.map((op) => `${op.fromTopic}\\${op.toTopic}`).join(',')
}

export function parseSubscriptions(str: string | null): Subscription[] | null {
	if (!str) return null
	// Split by comma for multiple subscriptions, then by backslash for topic pairs
	return str.split(',').map((op) => {
		const [fromTopic, toTopic] = op.split('\\') as [Topic, Topic]
		return { fromTopic, toTopic }
	})
}

export function getSubscriptionChanges(changes: Array<{ row: TlaRow; event: ReplicationEvent }>): {
	newSubscriptions: Subscription[] | null
	removedSubscriptions: Subscription[] | null
} {
	const newSubscriptions: Subscription[] = []
	const removedSubscriptions: Subscription[] = []

	for (const change of changes) {
		switch (change.event.table) {
			case 'file_state': {
				const fileState = change.row as TlaFileState
				const userTopic: Topic = `user:${fileState.userId}`
				const fileTopic: Topic = `file:${fileState.fileId}`

				if (change.event.command === 'insert') {
					// User gains access to a file
					newSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
				} else if (change.event.command === 'delete') {
					// User loses access to a file
					removedSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
				}
				break
			}
			case 'group_user': {
				const userGroup = change.row as TlaGroupUser
				const userTopic: Topic = `user:${userGroup.userId}`
				const groupTopic: Topic = `group:${userGroup.groupId}`
				if (change.event.command === 'insert') {
					newSubscriptions.push({ fromTopic: userTopic, toTopic: groupTopic })
				} else if (change.event.command === 'delete') {
					removedSubscriptions.push({ fromTopic: userTopic, toTopic: groupTopic })
				}
				break
			}
			case 'group_file': {
				const fileGroup = change.row as TlaGroupFile
				const fileTopic: Topic = `file:${fileGroup.fileId}`
				const groupTopic: Topic = `group:${fileGroup.groupId}`
				if (change.event.command === 'insert') {
					newSubscriptions.push({ fromTopic: groupTopic, toTopic: fileTopic })
				} else if (change.event.command === 'delete') {
					removedSubscriptions.push({ fromTopic: groupTopic, toTopic: fileTopic })
				}
				break
			}
			default:
				// Only file_state changes affect subscriptions at the moment
				break
		}
	}

	return {
		newSubscriptions: newSubscriptions.length > 0 ? newSubscriptions : null,
		removedSubscriptions: removedSubscriptions.length > 0 ? removedSubscriptions : null,
	}
}
