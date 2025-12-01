import {
	FairyModeDefinition,
	FairyWaitCondition,
	FairyWaitEvent,
	SerializedWaitCondition,
} from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages wait conditions for a fairy agent.
 * The agent can wait for specific events (like task completions or mode transitions)
 * and will be notified when those events occur.
 */
export class FairyAgentWaitManager extends BaseFairyAgentManager {
	/**
	 * An atom containing the conditions this agent is waiting for.
	 * When events matching these conditions occur, the agent will be notified.
	 */
	private $waitingFor: Atom<FairyWaitCondition<FairyWaitEvent>[]>

	/**
	 * Creates a new wait manager for the given fairy agent.
	 * Initializes with an empty array of wait conditions.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
		this.$waitingFor = atom('waitingFor', [])
	}

	/**
	 * Get the current list of wait conditions this agent is waiting for.
	 * @returns An array of wait conditions the agent is currently waiting for.
	 */
	getWaitingFor() {
		return this.$waitingFor.get()
	}

	/**
	 * Resets the wait manager by clearing all wait conditions.
	 * @returns void
	 */
	reset(): void {
		this.$waitingFor.set([])
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
	 * Duplicate conditions (same eventType and id) are automatically filtered out.
	 * @param condition - The wait condition to add.
	 * @returns void
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
	 * Add multiple wait conditions to the agent at once.
	 * Unlike `waitFor`, this method does not check for duplicates.
	 * @param conditions - An array of wait conditions to add.
	 * @returns void
	 */
	waitForAll(conditions: FairyWaitCondition<FairyWaitEvent>[]) {
		this.$waitingFor.update((existing) => {
			return [...existing, ...conditions]
		})
	}

	/**
	 * Clear all wait conditions for this agent.
	 * @returns void
	 */
	clear() {
		this.$waitingFor.set([])
	}

	/**
	 * Wake up the agent from waiting with a notification message.
	 * Note: This does NOT remove wait conditions - the matched conditions should
	 * already be removed by the notification system before calling this method.
	 * If the agent is currently generating, the message will be scheduled.
	 * Otherwise, it will be prompted immediately.
	 * @returns Promise that resolves when the prompt completes (if prompted)
	 */
	async notifyWaitConditionFulfilled({
		agentFacingMessage,
		userFacingMessage,
	}: {
		agentFacingMessage: string
		userFacingMessage: string | null
	}): Promise<void> {
		const { agent } = this
		if (agent.requests.isGenerating()) {
			agent.schedule({
				agentMessages: [agentFacingMessage],
				userMessages: userFacingMessage ? [userFacingMessage] : undefined,
				source: 'other-agent',
			})
		} else {
			await agent.prompt({
				agentMessages: [agentFacingMessage],
				userMessages: userFacingMessage ? [userFacingMessage] : undefined,
				source: 'other-agent',
			})
		}
	}

	/**
	 * Serialize the wait conditions to a plain object for persistence.
	 * The matcher functions are not serialized, only the eventType, id, and metadata.
	 * @returns An array of serialized wait conditions.
	 */
	serializeState(): SerializedWaitCondition[] {
		return this.$waitingFor.get().map((condition) => ({
			eventType: condition.eventType,
			id: condition.id,
			metadata: condition.metadata,
		}))
	}

	/**
	 * Load previously persisted wait conditions into the manager.
	 * Reconstructs wait conditions from serialized data by parsing the id format
	 * and recreating the appropriate condition types (task-completed or agent-mode-transition).
	 * Conditions that cannot be parsed are filtered out.
	 * @param waitingFor - An array of serialized wait conditions to load.
	 * @returns void
	 */
	loadState(waitingFor: SerializedWaitCondition[]) {
		const reconstructed = waitingFor
			.map((serialized) => {
				if (serialized.eventType === 'task-completed') {
					// Parse id format: "task-completed:${taskId}"
					const match = serialized.id.match(/^task-completed:(.+)$/)
					if (match) {
						const taskId = match[1]
						return this.agent.fairyApp.waits.createTaskWaitCondition(taskId)
					}
				} else if (serialized.eventType === 'agent-mode-transition') {
					// Parse id format: "agent-mode-transition:${agentId}:${mode}"
					const match = serialized.id.match(/^agent-mode-transition:(.+):(.+)$/)
					if (match) {
						const agentId = match[1]
						const mode = match[2] as FairyModeDefinition['type']
						return this.agent.fairyApp.waits.createAgentModeTransitionWaitCondition(agentId, mode)
					}
				}
				return null
			})
			.filter((condition): condition is FairyWaitCondition<FairyWaitEvent> => condition !== null)
		this.$waitingFor.set(reconstructed)
	}
}
