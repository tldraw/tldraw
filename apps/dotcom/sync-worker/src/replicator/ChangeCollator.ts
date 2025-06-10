import { TlaFileState, TlaRow } from '@tldraw/dotcom-shared'
import { DurableObject } from 'cloudflare:workers'
import { ZReplicationChange } from '../UserDataSyncer'
import { ChangeV2, ReplicationEvent, Topic } from './replicatorTypes'

/**
 * Interface for collecting and organizing database changes for delivery to users.
 *
 * Two main implementations:
 * - LiveChangeCollator: Real-time processing of new changes
 * - CatchUpChangeCollator: Replay historical changes for a specific user
 */
export interface ChangeCollator {
	/** True if this collator is replaying historical data, false for real-time */
	readonly isCatchUp: boolean
	/** Check if this collator should process changes for any of the given topics */
	hasListenerForTopics(topics: Topic[]): boolean
	/** Add a change that happened on multiple topics, ensuring each user gets it only once */
	addChangeForTopics(topics: Topic[], change: ZReplicationChange): void
	/** Add a list of subscriptions */
	addSubscriptions(subscriptions: Subscription[]): void
	/** Remove a list of subscriptions */
	removeSubscriptions(subscriptions: Subscription[]): void
}

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
	return ops.map((op) => `${op.fromTopic}\\${op.toTopic}`).join(',')
}
export function parseSubscriptions(str: string | null): Subscription[] | null {
	if (!str) return null
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

				if (change.event.command === 'insert' && !fileState.isFileOwner) {
					newSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
				} else if (change.event.command === 'delete' && !fileState.isFileOwner) {
					removedSubscriptions.push({ fromTopic: userTopic, toTopic: fileTopic })
				}
				break
			}
			default:
				break
		}
	}

	return {
		newSubscriptions: newSubscriptions.length > 0 ? newSubscriptions : null,
		removedSubscriptions: removedSubscriptions.length > 0 ? removedSubscriptions : null,
	}
}

/**
 * Build a deduplicated, comma-separated string of topics from an array of changes.
 * Ensures no duplicate topics in the final string.
 */
export function buildTopicsString(changes: ChangeV2[]): string {
	const allTopics = changes.flatMap((change) => change.topics)
	const uniqueTopics = [...new Set(allTopics)]
	return uniqueTopics.join(',')
}

/**
 * Collects changes for real-time delivery to all active users.
 *
 * Uses the subscription graph to determine which users should receive
 * each change. For example, if a file changes, it finds all users who
 * subscribe to that file (directly or through groups) and queues the
 * change for delivery to them.
 */
export class LiveChangeCollator implements ChangeCollator {
	readonly isCatchUp: boolean = false
	/** Maps userId -> array of changes to deliver to that user */
	readonly changes: Map<string, ZReplicationChange[]> = new Map()

	constructor(readonly sqlite: DurableObject['ctx']['storage']['sql']) {}

	hasListenerForTopics(_topics: Topic[]) {
		// In live mode, we assume someone is listening to every topic since
		// changes are happening in real-time. We'll filter to only active users
		// when actually delivering the changes.
		return true
	}

	/**
	 * Find all users who should receive changes for any of the given topics.
	 * Uses recursive SQL to traverse the subscription graph and find all
	 * users connected to these topics through any number of hops.
	 *
	 * Example: user:alice -> group:dev -> file:doc1
	 * When file:doc1 changes, alice gets notified even though she's not directly subscribed.
	 */
	private getSubscribersToTopics(topics: Topic[]): string[] {
		if (topics.length === 0) return []

		// Extract user topics directly without SQL query
		const directUsers = topics
			.filter((topic) => topic.startsWith('user:'))
			.map((topic) => topic.replace('user:', ''))

		// Get non-user topics that need recursive lookup
		const nonUserTopics = topics.filter((topic) => !topic.startsWith('user:'))

		if (nonUserTopics.length === 0) {
			return directUsers
		}

		// Use recursive CTE to find all users that subscribe to any of these topics
		// Build placeholders for the IN clause
		const placeholders = nonUserTopics.map(() => '?').join(',')

		const result = this.sqlite
			.exec<{ fromTopic: string }>(
				`
			WITH RECURSIVE subscribers AS (
				-- Direct subscriptions to any of the target topics
				SELECT fromTopic FROM topic_subscription WHERE toTopic IN (${placeholders})
				UNION ALL
				-- Transitive subscriptions (users -> groups -> topics)
				SELECT ts.fromTopic 
				FROM topic_subscription ts
				JOIN subscribers s ON ts.toTopic = s.fromTopic
			)
			SELECT DISTINCT fromTopic FROM subscribers WHERE fromTopic LIKE 'user:%'
		`,
				...nonUserTopics
			)
			.toArray()

		const recursiveUsers = result.map((row) => row.fromTopic.replace('user:', ''))

		// Combine and deduplicate all users
		return [...new Set([...directUsers, ...recursiveUsers])]
	}

	/**
	 * Queue a change for delivery to all users who subscribe to any of the given topics.
	 * Uses the subscription graph to fan out the change to all relevant users.
	 * Ensures each user gets the change only once even if they're subscribed to multiple topics.
	 */
	addChangeForTopics(topics: Topic[], change: ZReplicationChange) {
		// Get all unique users across all topics in a single SQL query
		const userIds = this.getSubscribersToTopics(topics)

		// Add the change once per unique user
		for (const userId of userIds) {
			let changes = this.changes.get(userId)
			if (!changes) {
				changes = []
				this.changes.set(userId, changes)
			}
			changes.push(change)
		}
	}

	/** Add a subscription edge to the database */
	protected addTopicSubscription(fromTopic: Topic, toTopic: Topic): void {
		this.sqlite.exec(
			`INSERT INTO topic_subscription (fromTopic, toTopic) VALUES (?, ?) ON CONFLICT (fromTopic, toTopic) DO NOTHING`,
			fromTopic,
			toTopic
		)
	}

	/** Remove a subscription edge from the database */
	protected removeTopicSubscription(fromTopic: Topic, toTopic: Topic): void {
		this.sqlite.exec(
			`DELETE FROM topic_subscription WHERE fromTopic = ? AND toTopic = ?`,
			fromTopic,
			toTopic
		)
	}

	addSubscriptions(subscriptions: Subscription[] | null): void {
		if (!subscriptions || subscriptions.length === 0) {
			return
		}
		for (const subscription of subscriptions) {
			this.addTopicSubscription(subscription.fromTopic, subscription.toTopic)
		}
	}

	removeSubscriptions(subscriptions: Subscription[] | null): void {
		if (!subscriptions || subscriptions.length === 0) {
			return
		}
		for (const subscription of subscriptions) {
			this.removeTopicSubscription(subscription.fromTopic, subscription.toTopic)
		}
	}
}

/**
 * Collects changes for catch-up/replay scenarios for a single specific user.
 *
 * When a user reconnects after being offline, we need to replay all the changes
 * they missed. This collator:
 * 1. Builds an in-memory snapshot of what the user was subscribed to
 * 2. Only collects changes relevant to that user
 * 3. Updates the subscription snapshot as subscription changes are replayed
 *
 * This is much more efficient than using LiveChangeCollator for catch-up since
 * we don't need to query the database for every single historical change.
 */
export class CatchUpChangeCollator extends LiveChangeCollator {
	/** All topics this user is subscribed to (directly or transitively) */
	userSubscriptions: Set<Topic> = new Set()
	/** Maps each topic to the set of topics it subscribes to */
	topicGraph: Map<Topic, Set<Topic>> = new Map()
	override readonly isCatchUp: boolean = true

	/** The user's own topic (user:userId) */
	userTopic

	/** All changes queued for this specific user */
	_changes: ZReplicationChange[] = []

	constructor(
		sqlite: DurableObject['ctx']['storage']['sql'],
		private readonly userId: string
	) {
		super(sqlite)
		this.userTopic = `user:${this.userId}` satisfies Topic
		// Put all changes in a single array for this user
		this.changes.set(this.userId, this._changes)

		// Build initial subscription snapshot from the database
		// This captures what the user was subscribed to at the start of catch-up
		const tuples = this.sqlite
			.exec<{ fromTopic: Topic; toTopic: Topic }>(
				`
			WITH RECURSIVE subscriptions AS (
				SELECT fromTopic, toTopic FROM topic_subscription WHERE fromTopic = ?
				UNION ALL
				-- Transitive subscriptions 
				SELECT s.fromTopic, ts.toTopic 
				FROM topic_subscription ts
				JOIN subscriptions s ON ts.fromTopic = s.toTopic
			)
			SELECT DISTINCT fromTopic, toTopic FROM subscriptions
			`,
				`user:${this.userId}`
			)
			.toArray()

		// Convert to Map<Topic, Set<Topic>> for efficient graph operations
		for (const { fromTopic, toTopic } of tuples) {
			if (!this.topicGraph.has(fromTopic)) {
				this.topicGraph.set(fromTopic, new Set())
			}
			this.topicGraph.get(fromTopic)!.add(toTopic)
		}

		this.rebuildUserSubscriptions()
	}

	/**
	 * Rebuild the set of all topics this user is subscribed to.
	 * Called after subscription changes to update our in-memory snapshot.
	 */
	rebuildUserSubscriptions() {
		this.userSubscriptions.clear()

		// Add all topics reachable through the subscription graph
		for (const [topic, subscriptions] of this.topicGraph.entries()) {
			if (subscriptions.size > 0) {
				this.userSubscriptions.add(topic)
				for (const subscription of subscriptions) {
					this.userSubscriptions.add(subscription)
				}
			}
		}
	}

	/**
	 * Check if this user cares about changes to the given topic.
	 * Only returns true if the user is subscribed to this topic (directly or transitively).
	 */
	override hasListenerForTopics(topics: Topic[]): boolean {
		return topics.some((topic) => topic === this.userTopic || this.userSubscriptions.has(topic))
	}

	/**
	 * Add a change for this user if they're subscribed to the topic.
	 * Much simpler than LiveChangeCollator since we only care about one user.
	 */
	override addChangeForTopics(topics: Topic[], change: ZReplicationChange) {
		if (this.hasListenerForTopics(topics)) {
			this._changes.push(change)
		}
	}

	/**
	 * Update our in-memory subscription snapshot when a new subscription is added.
	 * Only matters if it affects this user's subscription graph.
	 */
	protected override addTopicSubscription(fromTopic: Topic, toTopic: Topic) {
		if (!this.hasListenerForTopics([fromTopic])) {
			return
		}
		// Update the sqlite database too
		super.addTopicSubscription(fromTopic, toTopic)
		// Update our in-memory snapshot
		if (!this.topicGraph.has(fromTopic)) {
			this.topicGraph.set(fromTopic, new Set())
		}
		this.topicGraph.get(fromTopic)!.add(toTopic)
		this.userSubscriptions.add(toTopic)
	}

	/**
	 * Update our in-memory subscription snapshot when a subscription is removed.
	 * Only matters if it affects this user's subscription graph.
	 */
	protected override removeTopicSubscription(fromTopic: Topic, toTopic: Topic) {
		if (!this.hasListenerForTopics([toTopic])) {
			return
		}
		// Update the database
		super.removeTopicSubscription(fromTopic, toTopic)
		// Update our in-memory snapshot
		const subscriptions = this.topicGraph.get(fromTopic)
		if (subscriptions) {
			subscriptions.delete(toTopic)
			if (subscriptions.size === 0) {
				this.topicGraph.delete(fromTopic)
			}
		}
		// Rebuild since removing one subscription might make other topics unreachable
		this.rebuildUserSubscriptions()
	}
}
