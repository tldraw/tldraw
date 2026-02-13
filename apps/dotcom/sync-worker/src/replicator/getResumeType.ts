import { SqlStorage } from '@cloudflare/workers-types'
import { Logger } from '../Logger'
import { ZReplicationEventWithoutSequenceInfo } from '../UserDataSyncer'
import { CatchUpChangeCollator } from './ChangeCollator'
import { parseSubscriptions } from './Subscription'
import { ChangeV2, Topic } from './replicatorTypes'

export function getResumeType({
	sqlite,
	log,
	currentLsn,
	lsn,
	userId,
}: {
	sqlite: SqlStorage
	log: Logger
	currentLsn: string
	lsn: string
	userId: string
}): { type: 'done'; messages?: ZReplicationEventWithoutSequenceInfo[] } | { type: 'reboot' } {
	if (lsn >= currentLsn) {
		log.debug('getResumeType: resuming from current lsn', lsn, '>=', currentLsn)
		// targetLsn is now or in the future, we can register them and deliver events
		// without needing to check the history
		return { type: 'done' }
	}
	const earliestLsn = sqlite
		.exec<{ lsn: string }>('SELECT lsn FROM history ORDER BY rowid asc LIMIT 1')
		.toArray()[0]?.lsn

	if (!earliestLsn || lsn < earliestLsn) {
		log.debug('getResumeType: not enough history', lsn, '<', earliestLsn)
		// not enough history, we can't resume
		return { type: 'reboot' }
	}

	const history = sqlite.exec<{
		topics: string
		lsn: string
		rowid: number
		newSubscriptions: string | null
		removedSubscriptions: string | null
	}>(
		`
			SELECT rowid, lsn, topics, newSubscriptions, removedSubscriptions
			FROM history
			WHERE lsn > ?
			ORDER BY rowid ASC
		`,
		lsn
	)

	const messages: ZReplicationEventWithoutSequenceInfo[] = []
	const collator = new CatchUpChangeCollator(sqlite, userId)
	for (const { rowid, lsn, newSubscriptions, removedSubscriptions, topics } of history) {
		// Create a fresh collator for this LSN with current subscription state

		// Apply subscription operations first to update the user's subscription state

		if (newSubscriptions) {
			collator.addSubscriptions(parseSubscriptions(newSubscriptions))
		}

		// Check if any topics in this entry are relevant to the user's current subscriptions
		const entryTopics = topics.split(',').filter(Boolean) as Topic[]
		const hasRelevantTopic = collator.hasListenerForTopics(entryTopics)

		if (hasRelevantTopic) {
			const changesJson = sqlite
				.exec<{ changesJson: string }>(`SELECT changesJson FROM history WHERE rowid = ?`, rowid)
				.one().changesJson
			// Only parse changes JSON if this entry is relevant
			const historyChanges = JSON.parse(changesJson) as ChangeV2[]
			for (const change of historyChanges) {
				collator.handleEvent(change)
			}
		}

		if (removedSubscriptions) {
			collator.removeSubscriptions(parseSubscriptions(removedSubscriptions))
		}

		if (collator._changes.length) {
			messages.push({ type: 'changes', changes: collator._changes.slice(), lsn })
			collator._changes.length = 0
		}
	}

	if (messages.length === 0) {
		log.debug('getResumeType: no history to replay, all good', lsn)
		return { type: 'done' }
	}

	log.debug('getResumeType: resuming', messages.length, messages)
	return { type: 'done', messages }
}
