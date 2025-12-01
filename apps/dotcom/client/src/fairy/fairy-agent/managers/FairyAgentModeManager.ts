import { FairyModeDefinition, getFairyModeDefinition } from '@tldraw/fairy-shared'
import { atom, Atom } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { FAIRY_MODE_CHART } from '../FairyModeNode'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages the mode/state of a fairy agent.
 * Handles mode transitions and lifecycle hooks (onEnter, onExit).
 */
export class FairyAgentModeManager extends BaseFairyAgentManager {
	/**
	 * An atom containing the current fairy mode.
	 */
	private $mode: Atom<FairyModeDefinition['type']>

	/**
	 * Creates a new mode manager for the given fairy agent.
	 * Initializes the mode to 'sleeping'.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
		this.$mode = atom('fairyMode', 'sleeping')
	}

	/**
	 * Resets the mode manager to its initial state.
	 * Sets the mode to 'sleeping' and updates the fairy entity's pose accordingly.
	 * @returns void
	 */
	reset(): void {
		this.$mode.set('sleeping')
		const modeDefinition = getFairyModeDefinition('sleeping')
		this.agent.updateEntity((fairy) => ({ ...fairy, pose: modeDefinition.pose }))
	}

	/**
	 * Change the mode of the agent.
	 * Triggers lifecycle hooks (onExit on old mode, onEnter on new mode).
	 * Also notifies other agents waiting for this mode transition and updates
	 * the fairy entity's pose to match the new mode.
	 * @param mode - The mode to set.
	 * @returns void
	 */
	setMode(mode: FairyModeDefinition['type']) {
		const fromMode = this.getMode()
		const fromModeNode = FAIRY_MODE_CHART[fromMode]
		const toModeNode = FAIRY_MODE_CHART[mode]

		// Call lifecycle hooks
		fromModeNode.onExit?.(this.agent, mode)
		toModeNode.onEnter?.(this.agent, fromMode)

		// Notify other agents waiting for this mode transition
		this.agent.fairyApp.waits.notifyAgentModeTransition(this.agent.id, mode)

		// Update the mode
		this.$mode.set(mode)

		// Update the fairy entity's pose to match the new mode
		const modeDefinition = getFairyModeDefinition(mode)
		this.agent.updateEntity((fairy) => ({ ...fairy, pose: modeDefinition.pose }))
	}

	/**
	 * Get the current mode of the agent.
	 * @returns The current mode type.
	 */
	getMode(): FairyModeDefinition['type'] {
		return this.$mode.get()
	}

	/**
	 * Check if the fairy is currently sleeping.
	 * @returns True if the fairy is in 'sleeping' mode, false otherwise.
	 */
	isSleeping() {
		return this.getMode() === 'sleeping'
	}

	/**
	 * Get the mode definition for the current mode.
	 * @returns The mode definition containing pose, memory level, and other mode-specific configuration.
	 */
	getModeDefinition() {
		return getFairyModeDefinition(this.getMode())
	}
}
