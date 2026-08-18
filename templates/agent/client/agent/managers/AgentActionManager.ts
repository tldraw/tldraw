import { RecordsDiff, structuredClone, TLRecord } from 'tldraw'
import { AgentAction } from '../../../shared/types/AgentAction'
import { ChatHistoryItem } from '../../../shared/types/ChatHistoryItem'
import { Streaming } from '../../../shared/types/Streaming'
import { AgentActionUtil, getAgentActionUtilsRecordForMode } from '../../actions/AgentActionUtil'
import { AgentHelpers } from '../../AgentHelpers'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Owns the agent's action utils and applies actions to the editor and chat history.
 */
export class AgentActionManager extends BaseAgentManager {
	private agentActionUtils: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.agentActionUtils = getAgentActionUtilsRecordForMode(agent, agent.mode.getCurrentModeType())
	}

	reset(): void {
		// action utils are stateless
	}

	rebuildUtilsForMode(mode: string): void {
		this.agentActionUtils = getAgentActionUtilsRecordForMode(this.agent, mode)
	}

	getAgentActionUtil(type?: string) {
		return this.agentActionUtils[this.getAgentActionUtilType(type)]
	}

	/**
	 * Resolve an action type to a known util type. Falls back to 'unknown' when
	 * the model hasn't finished streaming the type yet or made one up.
	 */
	getAgentActionUtilType(type?: string): AgentAction['_type'] {
		if (type && type in this.agentActionUtils) return type as AgentAction['_type']
		return 'unknown'
	}

	/**
	 * Apply an action to the editor and record it in chat history.
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
			this.agent.onError(error)
			throw error // you may not want to throw in production
		} finally {
			this.agent.setIsActingOnEditor(false)
		}

		if (util.savesToHistory()) {
			const historyItem: ChatHistoryItem = {
				type: 'action',
				action,
				diff,
				acceptance: 'pending',
			}

			this.agent.chat.update((historyItems) => {
				// A streaming action arrives as a series of increasingly complete versions.
				// Replace the previous version if it is still incomplete and belongs to this
				// turn (i.e. comes after the last external prompt; 'self' prompts are internal).
				const lastPromptIndex = historyItems.findLastIndex(
					(item) => item.type === 'prompt' && item.promptSource !== 'self'
				)
				const lastActionIndex = historyItems.findLastIndex((item) => item.type === 'action')
				const lastAction = lastActionIndex !== -1 ? historyItems[lastActionIndex] : null
				if (
					lastAction?.type === 'action' &&
					!lastAction.action.complete &&
					lastActionIndex > lastPromptIndex
				) {
					const newHistoryItems = [...historyItems]
					newHistoryItems[lastActionIndex] = historyItem
					return newHistoryItems
				}
				return [...historyItems, historyItem]
			})
		}

		return { diff, promise }
	}
}
