import {
	AgentAction,
	AgentActionInfo,
	ChatHistoryItem,
	createAgentActionInfo,
	getFairyModeDefinition,
	Streaming,
} from '@tldraw/fairy-shared'
import { createEmptyRecordsDiff, RecordsDiff, structuredClone, TLRecord, uniqueId } from 'tldraw'
import { isDevelopmentEnv } from '../../../utils/env'
import { AgentActionUtil } from '../../fairy-actions/AgentActionUtil'
import { getAgentActionUtilsRecord } from '../../fairy-part-utils/fairy-part-utils'
import { AgentHelpers } from '../AgentHelpers'
import type { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages action-related functionality for the fairy agent.
 * Handles action utils, action execution, and action info.
 */
export class FairyAgentActionManager extends BaseFairyAgentManager {
	constructor(public agent: FairyAgent) {
		super(agent)
		this.agentActionUtils = getAgentActionUtilsRecord(agent)
	}

	/**
	 * A record of the agent's action util instances.
	 * Used by the `getAgentActionUtil` method.
	 */
	private agentActionUtils: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

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
	getAgentActionUtilType(type?: string) {
		if (!type) return 'unknown'
		const util = this.agentActionUtils[type as AgentAction['_type']]
		if (!util) return 'unknown'
		return type as AgentAction['_type']
	}

	/**
	 * Get information about an agent action, mostly used to display actions within the chat history UI.
	 * @param action - The action to get information about.
	 * @returns The information about the action.
	 */
	getActionInfo(action: Streaming<AgentAction>): AgentActionInfo {
		const util = this.getAgentActionUtil(action._type)
		const info = util.getInfo(action) ?? {}
		const {
			icon = null,
			description = null,
			summary = null,
			canGroup = () => true,
			pose = null,
		} = info

		return createAgentActionInfo({
			icon,
			description,
			summary,
			canGroup,
			pose,
		})
	}

	/**
	 * Make the agent perform an action.
	 * Applies the action to the editor, tracks it in chat history, and handles page synchronization.
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

		const actionInfo = this.getActionInfo(action)
		if (actionInfo.pose) {
			// check the mode at the exact instant we would set the pose, if the fairy has somehow become inactive, set the pose to idle
			const modeDefinition = getFairyModeDefinition(this.agent.mode.getMode())
			if (modeDefinition.active) {
				this.agent.updateEntity((fairy) => ({
					...fairy,
					pose: actionInfo.pose ?? fairy.pose,
				}))
			} else {
				this.agent.updateEntity((fairy) => ({ ...fairy, pose: 'idle' }))
			}
		}

		// Ensure the fairy is on the correct page before performing the action
		// Only do this for complete actions - incomplete actions may have partial shapeIds
		// that could accidentally match shapes on other pages
		if (action.complete) {
			this.ensureFairyIsOnCorrectPage(action)
		}

		const modeDefinition = getFairyModeDefinition(this.agent.mode.getMode())
		let promise: Promise<void> | null = null
		let diff: RecordsDiff<TLRecord> = createEmptyRecordsDiff()
		try {
			diff = editor.store.extractingChanges(() => {
				this.agent.fairyApp.setIsApplyingAction(true)
				promise = util.applyAction(structuredClone(action), helpers) ?? null
				this.agent.fairyApp.setIsApplyingAction(false)
			})
		} catch (error) {
			// always toast the error
			this.agent.onError(error)
			promise = null
			if (isDevelopmentEnv) {
				// In development, crash by throwing error
				throw error
			}
		} finally {
			this.agent.setIsActingOnEditor(false)
		}

		// Add the action to chat history
		if (util.savesToHistory()) {
			const historyItem: ChatHistoryItem = {
				id: uniqueId(),
				type: 'action',
				action,
				diff,
				acceptance: 'pending',
				memoryLevel: modeDefinition.memoryLevel,
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

	/**
	 * Reset the action manager to its initial state.
	 * Currently no state to reset as action utils are stateless.
	 */
	reset(): void {
		// Reset state if needed - currently no state to reset
	}

	/**
	 * Ensures the fairy is on the correct page before performing an action.
	 * For actions that work with existing shapes, switches to the shape's page.
	 * For actions that create new content, ensures the fairy is on the current editor page.
	 * @param action - The action being performed.
	 * @private
	 */
	private ensureFairyIsOnCorrectPage(action: Streaming<AgentAction>) {
		const { editor } = this.agent
		const fairyEntity = this.agent.getEntity()
		if (!fairyEntity) return

		// Extract shape IDs from the action based on action type
		let shapeIds: string[] = []

		// Actions with single shapeId
		if ('shapeId' in action && typeof action.shapeId === 'string') {
			shapeIds = [action.shapeId]
		}
		// Actions with shapeIds array
		else if ('shapeIds' in action && Array.isArray(action.shapeIds)) {
			shapeIds = action.shapeIds as string[]
		}
		// Update action has shape in 'update' property
		else if (
			action._type === 'update' &&
			'update' in action &&
			action.update &&
			typeof action.update === 'object' &&
			'shapeId' in action.update
		) {
			shapeIds = [action.update.shapeId as string]
		}

		// If we have shape IDs, ensure the fairy is on the same page as the first shape
		if (shapeIds.length > 0) {
			const firstShapeId = shapeIds[0].startsWith('shape:') ? shapeIds[0] : `shape:${shapeIds[0]}`
			const shape = editor.getShape(firstShapeId as any)

			if (shape) {
				const shapePageId = editor.getAncestorPageId(shape)
				if (shapePageId && fairyEntity.currentPageId !== shapePageId) {
					// Switch to the shape's page
					editor.setCurrentPage(shapePageId)
					this.agent.updateEntity((f) => (f ? { ...f, currentPageId: shapePageId } : f))
				}
			}
		}
		// For create actions or actions without shape IDs, ensure fairy is on the current editor page
		else if (action._type === 'create' || action._type === 'pen') {
			const currentPageId = editor.getCurrentPageId()
			if (fairyEntity.currentPageId !== currentPageId) {
				this.agent.updateEntity((f) => (f ? { ...f, currentPageId } : f))
			}
		}
	}
}
