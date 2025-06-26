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
					// User gains access to a file - create subscription from user to file
					newSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
				} else if (change.event.command === 'delete') {
					// User loses access to a file - remove subscription from user to file
					removedSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
				}
				break
			}
			case 'group_user': {
				const userGroup = change.row as TlaGroupUser
				const userTopic: Topic = `user:${userGroup.userId}`
				const groupTopic: Topic = `group:${userGroup.groupId}`
				if (change.event.command === 'insert') {
					// User joins a group - create subscription from user to group
					newSubscriptions.push({ fromTopic: userTopic, toTopic: groupTopic })
				} else if (change.event.command === 'delete') {
					// User leaves a group - remove subscription from user to group
					removedSubscriptions.push({ fromTopic: userTopic, toTopic: groupTopic })
				}
				break
			}
			case 'group_file': {
				const fileGroup = change.row as TlaGroupFile
				const fileTopic: Topic = `file:${fileGroup.fileId}`
				const groupTopic: Topic = `group:${fileGroup.groupId}`
				if (change.event.command === 'insert') {
					// File is added to group - create subscription from group to file
					newSubscriptions.push({ fromTopic: groupTopic, toTopic: fileTopic })
				} else if (change.event.command === 'delete') {
					// File is removed from group - remove subscription from group to file
					removedSubscriptions.push({ fromTopic: groupTopic, toTopic: fileTopic })
				}
				break
			}
			default:
				// Only file_state, group_user, and group_file changes affect subscriptions
				break
		}
	}

	return {
		newSubscriptions: newSubscriptions.length > 0 ? newSubscriptions : null,
		removedSubscriptions: removedSubscriptions.length > 0 ? removedSubscriptions : null,
	}
}

export type TopicSubscriptionTree = {
	[key in Topic]: 1 | TopicSubscriptionTree
}

/**
 * Recursively traverses a topic subscription graph and returns an array of subscriptions.
 * For example, given {a: {b: {c: 1, d: {e: 1}}}} it returns [a->b, b->c, b->d, d->e]
 */
export function parseTopicSubscriptionTree(
	graph: TopicSubscriptionTree,
	parentTopic?: Topic
): Subscription[] {
	const subscriptions: Subscription[] = []

	function traverse(node: TopicSubscriptionTree, parentTopic?: Topic) {
		for (const [topic, value] of Object.entries(node)) {
			// If we have a parent topic, create a subscription from parent to this topic
			if (parentTopic) {
				subscriptions.push({
					fromTopic: parentTopic,
					toTopic: topic as Topic,
				})
			}

			// If the value is an object (not 1), recursively traverse it
			if (typeof value === 'object') {
				traverse(value, topic as Topic)
			}
		}
	}

	traverse(graph, parentTopic)
	return subscriptions
}
