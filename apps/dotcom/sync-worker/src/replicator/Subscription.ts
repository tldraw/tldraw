import { TlaFileState, TlaRow } from '@tldraw/dotcom-shared'
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

				// Only create subscriptions for non-owners (guests/collaborators)
				// File owners get notifications through their own user topic
				if (change.event.command === 'insert' && !fileState.isFileOwner) {
					// User gains access to a file (shared with them)
					newSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
				} else if (change.event.command === 'delete' && !fileState.isFileOwner) {
					// User loses access to a file (no longer shared with them)
					removedSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
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
