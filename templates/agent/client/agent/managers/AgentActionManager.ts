import { RecordsDiff, structuredClone, TLRecord } from 'tldraw'
import { AgentAction } from '../../../shared/types/AgentAction'
import { ChatHistoryItem } from '../../../shared/types/ChatHistoryItem'
import { Streaming } from '../../../shared/types/Streaming'
import { AgentActionUtil, getAgentActionUtilsRecordForMode } from '../../actions/AgentActionUtil'
import { AgentHelpers } from '../../AgentHelpers'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages action-related functionality for the agent.
 * Handles action utils, action execution, and chat history updates for actions.
 */
export class AgentActionManager extends BaseAgentManager {
	/**
	 * A record of the agent's action util instances.
	 * Used by the `getAgentActionUtil` method.
	 */
	private agentActionUtils: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	/**
	 * The agent action util instance for the "unknown" action type.
	 *
	 * This is returned by the `getAgentActionUtil` method when the action type
	 * isn't properly specified. This can happen if the model isn't finished
	 * streaming yet or makes a mistake.
	 */
	unknownActionUtil: AgentActionUtil<AgentAction>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.agentActionUtils = getAgentActionUtilsRecordForMode(
			this.agent,
			agent.mode.getCurrentModeType()
		)
		this.unknownActionUtil = this.agentActionUtils.unknown
	}

	/**
	 * Reset the action manager to its initial state.
	 * Currently no state to reset as action utils are stateless.
	 */
	reset(): void {
		// Reset state if needed - currently no state to reset
	}

	/**
	 * Rebuild action utils for a specific mode.
	 * Called when the agent's mode changes to ensure mode-specific
	 * action utils are used.
	 *
	 * @param mode - The mode to rebuild utils for.
	 */
	rebuildUtilsForMode(mode: string): void {
		this.agentActionUtils = getAgentActionUtilsRecordForMode(this.agent, mode)
		this.unknownActionUtil = this.agentActionUtils.unknown
	}

	/**
	 * Get an agent action util for a specific action type.
	 *
	 * @param type - The type of action to get the util for.
	 * @returns The action util.
	 */
	getAgentActionUtil(type?: string) {
		const utilType = this.getAgentActionUtilType(type)
		return this.agentActionUtils[utilType]
	}

	/**
	 * Get the util type for a provided action type.
	 * If no util type is found, returns 'unknown'.
	 * @param type - The action type to get the util type for.
	 * @returns The action util type, or 'unknown' if not found.
	 */
	getAgentActionUtilType(type?: string): AgentAction['_type'] {
		if (!type) return 'unknown'
		const util = this.agentActionUtils[type as AgentAction['_type']]
		if (!util) return 'unknown'
		return type as AgentAction['_type']
	}

	/**
	 * Make the agent perform an action.
	 * Applies the action to the editor and tracks it in chat history.
	 * @param action - The action to make the agent do.
	 * @param helpers - The helpers to use for action execution.
	 * @returns An object containing the diff of changes made and a promise that resolves when the action completes.
	 */
	act(
		action: Streaming<AgentAction>,
		helpers: AgentHelpers = new AgentHelpers(this.agent)
	): {
		diff: RecordsDiff<TLRecord>
		promise: Promise<void> | null
	} {
		const { editor } = this.agent
		const util = this.getAgentActionUtil(action._type)
		this.agent.setIsActingOnEditor(true)

		let promise: Promise<void> | null = null
		let diff: RecordsDiff<TLRecord>
		try {
			diff = editor.store.extractingChanges(() => {
				promise = util.applyAction(structuredClone(action), helpers) ?? null
			})
		} catch (error) {
			// always toast the error
			this.agent.onError(error)
			promise = null
			throw error // you may not want to throw in productions
		} finally {
			this.agent.setIsActingOnEditor(false)
		}

		// Add the action to chat history
		if (util.savesToHistory()) {
			const historyItem: ChatHistoryItem = {
				type: 'action',
				action,
				diff,
				acceptance: 'pending',
			}

			this.agent.chat.update((historyItems) => {
				// If there are no items, start off the chat history with the first item
				if (historyItems.length === 0) return [historyItem]

				// Find the last EXTERNAL prompt index (ignore prompts from 'self' which are internal state transitions)
				const lastPromptIndex = historyItems.findLastIndex(
					(item) => item.type === 'prompt' && item.promptSource !== 'self'
				)

				// If the last action is still in progress AND it's after the last external prompt, replace it
				const lastActionHistoryItemIndex = historyItems.findLastIndex(
					(item) => item.type === 'action'
				)
				const lastActionHistoryItem =
					lastActionHistoryItemIndex !== -1 ? historyItems[lastActionHistoryItemIndex] : null
				if (
					lastActionHistoryItem &&
					lastActionHistoryItem.type === 'action' &&
					!lastActionHistoryItem.action.complete &&
					(lastPromptIndex === -1 || lastActionHistoryItemIndex > lastPromptIndex)
				) {
					const newHistoryItems = [...historyItems]
					// Replace the incomplete action with the complete one (timestamp already set above)
					newHistoryItems[lastActionHistoryItemIndex] = historyItem
					return newHistoryItems
				} else {
					// Otherwise, just add the new item to the end of the list
					return [...historyItems, historyItem]
				}
			})
		}

		return { diff, promise }
	}
}
