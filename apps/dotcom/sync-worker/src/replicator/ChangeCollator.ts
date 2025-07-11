import {
	TlaFile,
	TlaFileState,
	TlaRow,
	TlaUser,
	TlaUserMutationNumber,
	ZTable,
} from '@tldraw/dotcom-shared'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { DurableObject } from 'cloudflare:workers'
import { ZReplicationChange } from '../UserDataSyncer'
import { Subscription } from './Subscription'
import { ChangeV2, ReplicationEvent, ReplicatorEffect, Topic } from './replicatorTypes'

export function getTopics(row: TlaRow, event: ReplicationEvent): Topic[] {
	switch (event.table) {
		case 'user':
			return [`user:${(row as TlaUser).id}`]
		case 'file': {
			const file = row as TlaFile
			// File events notify both the file topic AND the file owner's user topic
			return [`file:${file.id}`, `user:${file.ownerId}`]
		}
		case 'file_state': {
			const fileState = row as TlaFileState
			return [`user:${fileState.userId}`]
		}
		case 'user_mutation_number':
			return [`user:${(row as any as TlaUserMutationNumber).userId}`]
		default: {
			exhaustiveSwitchError(event.table)
			return [] // just in case
		}
	}
}

export function getEffects(change: ChangeV2): ReplicatorEffect[] | null {
	if (change.event.table !== 'file') return null
	const file = change.row as TlaFile

	const effects: ReplicatorEffect[] = [
		{
			type: 'notify_file_durable_object',
			command: change.event.command,
			file,
		},
	]

	if (change.event.command === 'update') {
		const previous = change.previous as TlaFile
		if (file.published && (!previous.published || file.lastPublished !== previous.lastPublished)) {
			effects.push({ type: 'publish', file })
		} else if (!file.published && previous.published) {
			effects.push({ type: 'unpublish', file })
		}
	}

	return effects
}

/**
 * Collects and organizes database changes for delivery to users.
 *
 * Uses the subscription graph to determine which users should receive
 * each change. For example, if a file changes, it finds all users who
 * subscribe to that file (directly or through groups) and queues the
 * change for delivery to them.
 *
 * This is the main implementation for real-time processing of new changes.
 */
export class ChangeCollator {
	/** Maps userId -> array of changes to deliver to that user */
	readonly changes: Map<string, ZReplicationChange[]> = new Map()
	readonly effects: ReplicatorEffect[] = []

	constructor(readonly sqlite: DurableObject['ctx']['storage']['sql']) {}

	/** Check if this collator should process changes for any of the given topics */
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
				UNION
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

	/** Add a change that happened on multiple topics, ensuring each user gets it only once */
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

	handleEvent(change: ChangeV2) {
		// we update subscriptions during both normal operation and catch up
		const { command, table } = change.event

		const effects = getEffects(change)
		if (effects) {
			this.effects.push(...effects)
		}

		// Check if any of the topics have listeners
		const hasAnyListener = this.hasListenerForTopics(change.topics)
		if (!hasAnyListener) {
			return
		}

		const replicationChange: ZReplicationChange =
			table === 'user_mutation_number'
				? {
						type: 'mutation_commit',
						mutationNumber: (change.row as any as TlaUserMutationNumber).mutationNumber,
						userId: (change.row as any as TlaUserMutationNumber).userId,
					}
				: {
						type: 'row_update',
						row: change.row,
						table: table as ZTable,
						event: command,
					}

		// Add the change for all topics at once to avoid duplicates
		this.addChangeForTopics(change.topics, replicationChange)
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

	/** Add a list of subscriptions */
	addSubscriptions(subscriptions: Subscription[] | null): void {
		if (!subscriptions || subscriptions.length === 0) {
			return
		}
		for (const subscription of subscriptions) {
			this.addTopicSubscription(subscription.fromTopic, subscription.toTopic)
		}
	}

	/** Remove a list of subscriptions */
	removeSubscriptions(subscriptions: Subscription[] | null): void {
		if (!subscriptions || subscriptions.length === 0) {
			return
		}
		for (const subscription of subscriptions) {
			this.removeTopicSubscription(subscription.fromTopic, subscription.toTopic)
		}
	}
}
