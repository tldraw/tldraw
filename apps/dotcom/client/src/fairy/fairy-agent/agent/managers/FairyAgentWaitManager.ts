import { FairyWaitCondition, FairyWaitEvent, SerializedWaitCondition } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { deserializeWaitCondition, serializeWaitCondition } from '../../../fairy-wait-notifications'
import { FairyAgent } from '../FairyAgent'

/**
 * Manages wait conditions for a fairy agent.
 * The agent can wait for specific events (like task completions or mode transitions)
 * and will be notified when those events occur.
 */
export class FairyAgentWaitManager {
	/**
	 * An atom containing the conditions this agent is waiting for.
	 * When events matching these conditions occur, the agent will be notified.
	 */
	$waitingFor: Atom<FairyWaitCondition<FairyWaitEvent>[]>

	constructor(public agent: FairyAgent) {
		this.$waitingFor = atom('waitingFor', [])
	}

	/**
	 * Check if the agent is currently waiting for any events.
	 * @returns true if the agent has any wait conditions
	 */
	isWaiting() {
		return this.$waitingFor.get().length > 0
	}

	/**
	 * Add a wait condition to the agent.
	 * The agent will be notified when an event matching this condition occurs.
	 * @param condition - The wait condition to add
	 */
	waitFor(condition: FairyWaitCondition<FairyWaitEvent>) {
		this.$waitingFor.update((conditions) => {
			// Check if an equivalent condition already exists
			const isDuplicate = conditions.some((existing) => {
				if (existing.eventType !== condition.eventType) {
					return false
				}
				if (existing.id && condition.id) {
					return existing.id === condition.id
				}
				return false
			})

			if (isDuplicate) {
				return conditions
			}

			return [...conditions, condition]
		})
	}

	/**
	 * Clear all wait conditions for this agent.
	 */
	stopWaiting() {
		this.$waitingFor.set([])
	}

	/**
	 * Wake up the agent from waiting with a notification message.
	 * Note: This does NOT remove wait conditions - the matched conditions should
	 * already be removed by the notification system before calling this method.
	 */
	notifyWaitConditionFulfilled({
		agentFacingMessage,
		userFacingMessage,
	}: {
		agentFacingMessage: string
		userFacingMessage: string | null
	}) {
		const { agent } = this
		if (agent.isGenerating()) {
			agent.schedule({
				agentMessages: [agentFacingMessage],
				userMessages: userFacingMessage ? [userFacingMessage] : undefined,
				source: 'other-agent',
			})
		} else {
			agent.prompt({
				agentMessages: [agentFacingMessage],
				userMessages: userFacingMessage ? [userFacingMessage] : undefined,
				source: 'other-agent',
			})
		}
	}

	/**
	 * Serialize the wait conditions to a plain object for persistence.
	 */
	serializeState(): SerializedWaitCondition[] {
		return this.$waitingFor.get().map(serializeWaitCondition)
	}

	/**
	 * Load previously persisted wait conditions into the manager.
	 */
	loadState(waitingFor: SerializedWaitCondition[]) {
		const reconstructed = waitingFor
			.map(deserializeWaitCondition)
			.filter((condition): condition is FairyWaitCondition<FairyWaitEvent> => condition !== null)
		this.$waitingFor.set(reconstructed)
	}
}
