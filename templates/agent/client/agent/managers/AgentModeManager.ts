import { Atom, atom } from 'tldraw'
import type { AgentRequest } from '../../../shared/types/AgentRequest'
import { getModeNode } from '../../modes/AgentModeChart'
import { AgentModeType, getAgentModeDefinition } from '../../modes/AgentModeDefinitions'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages the mode/state of an agent.
 * The mode determines what prompt parts and actions are available.
 */
export class AgentModeManager extends BaseAgentManager {
	/**
	 * An atom containing the current agent mode.
	 */
	private $mode: Atom<AgentModeType>

	/**
	 * Creates a new mode manager for the given agent.
	 * Initializes the mode to 'default'.
	 */
	constructor(agent: TldrawAgent) {
		super(agent)
		this.$mode = atom('mode', 'idling')
	}

	/**
	 * Resets the mode manager to its initial state.
	 * Sets the mode to 'idling'.
	 */
	reset(): void {
		this.$mode.set('idling')
	}

	/**
	 * Get the current mode of the agent.
	 * @returns The current mode type.
	 */
	getMode(): AgentModeType {
		return this.$mode.get()
	}

	/**
	 * Set the mode of the agent.
	 * Calls onExit for the current mode and onEnter for the new mode.
	 * @param mode - The mode to set.
	 */
	setMode(mode: AgentModeType) {
		const currentMode = this.$mode.get()

		// Don't do anything if we're already in this mode
		if (currentMode === mode) return

		// Call onExit for the current mode
		const currentNode = getModeNode(currentMode)
		currentNode?.onExit?.(this.agent, mode)

		// Update the mode
		this.$mode.set(mode)

		// Call onEnter for the new mode
		const newNode = getModeNode(mode)
		newNode?.onEnter?.(this.agent, currentMode)
	}

	/**
	 * Get the mode definition for the current mode.
	 * @returns The mode definition containing parts and actions.
	 */
	getModeDefinition() {
		return getAgentModeDefinition(this.getMode())
	}

	// ==================== Prompt Lifecycle ====================

	/**
	 * Called when a prompt starts.
	 * Invokes the current mode's onPromptStart hook if defined.
	 */
	onPromptStart(request: AgentRequest) {
		const node = getModeNode(this.getMode())
		node?.onPromptStart?.(this.agent, request)
	}

	/**
	 * Called when a prompt ends successfully.
	 * Invokes the current mode's onPromptEnd hook if defined.
	 */
	onPromptEnd(request: AgentRequest) {
		const node = getModeNode(this.getMode())
		node?.onPromptEnd?.(this.agent, request)
	}

	/**
	 * Called when a prompt is cancelled.
	 * Invokes the current mode's onPromptCancel hook if defined.
	 */
	onPromptCancel(request: AgentRequest) {
		const node = getModeNode(this.getMode())
		node?.onPromptCancel?.(this.agent, request)
	}
}
