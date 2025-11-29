import { FairyModeDefinition, getFairyModeDefinition } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { notifyAgentModeTransition } from '../../../fairy-wait-notifications'
import { FairyAgent } from '../FairyAgent'
import { FAIRY_MODE_CHART } from '../FairyModeNode'

/**
 * Manages the mode/state of a fairy agent.
 * Handles mode transitions and lifecycle hooks (onEnter, onExit).
 */
export class FairyAgentModeManager {
	/**
	 * An atom containing the current fairy mode.
	 */
	private $mode: Atom<FairyModeDefinition['type']>

	constructor(public agent: FairyAgent) {
		this.$mode = atom('fairyMode', 'sleeping')
	}

	/**
	 * Change the mode of the agent.
	 * Triggers lifecycle hooks (onExit on old mode, onEnter on new mode).
	 * @param mode - The mode to set.
	 */
	setMode(mode: FairyModeDefinition['type']) {
		const fromMode = this.getMode()
		const fromModeNode = FAIRY_MODE_CHART[fromMode]
		const toModeNode = FAIRY_MODE_CHART[mode]

		// Call lifecycle hooks
		fromModeNode.onExit?.(this.agent, mode)
		toModeNode.onEnter?.(this.agent, fromMode)

		// Notify other agents waiting for this mode transition
		notifyAgentModeTransition(this.agent.id, mode, this.agent.editor)

		// Update the mode
		this.$mode.set(mode)

		// Update the fairy entity's pose to match the new mode
		const modeDefinition = getFairyModeDefinition(mode)
		this.agent.$fairyEntity.update((fairy) => ({ ...fairy, pose: modeDefinition.pose }))
	}

	/**
	 * Get the current mode of the agent.
	 * @returns The mode.
	 */
	getMode(): FairyModeDefinition['type'] {
		return this.$mode.get()
	}

	/**
	 * Check if the fairy is currently sleeping.
	 */
	isSleeping() {
		return this.getMode() === 'sleeping'
	}

	/**
	 * Get the mode definition for the current mode.
	 */
	getModeDefinition() {
		return getFairyModeDefinition(this.getMode())
	}
}
