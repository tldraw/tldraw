import { Atom, atom } from 'tldraw'
import { getModeNode } from '../../modes/AgentModeChart'
import { AgentModeType, getAgentModeDefinition } from '../../modes/AgentModeDefinitions'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * The agent's current mode, which determines which prompt parts and actions
 * are available.
 */
export class AgentModeManager extends BaseAgentManager {
	private $mode: Atom<AgentModeType>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$mode = atom('mode', 'idling')
	}

	reset(): void {
		this.$mode.set('idling')
	}

	getCurrentModeType(): AgentModeType {
		return this.$mode.get()
	}

	/**
	 * Switch mode, running the old mode's onExit and the new mode's onEnter,
	 * and rebuilding action utils for the new mode.
	 */
	setMode(newMode: AgentModeType) {
		const fromMode = this.getCurrentModeType()

		// TODO see if this is needed, or if it should just be a return, or if we can remove it entirely
		if (fromMode === newMode) {
			throw new Error(`Agent is already in mode: ${newMode}`)
		}

		this.getCurrentModeNode().onExit?.(this.agent, newMode)
		getModeNode(newMode).onEnter?.(this.agent, fromMode)

		this.$mode.set(newMode)
		this.agent.actions.rebuildUtilsForMode(newMode)
	}

	getCurrentModeDefinition() {
		return getAgentModeDefinition(this.getCurrentModeType())
	}

	getCurrentModeNode() {
		return getModeNode(this.getCurrentModeType())
	}
}
