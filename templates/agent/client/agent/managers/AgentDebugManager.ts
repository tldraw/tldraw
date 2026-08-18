import { Atom, atom } from 'tldraw'
import type { AgentAction } from '../../../shared/types/AgentAction'
import type { Streaming } from '../../../shared/types/Streaming'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

export interface AgentDebugFlags {
	/** Log the system prompt to the console (worker-side). */
	logSystemPrompt: boolean
	/** Log messages sent to the model (worker-side). */
	logMessages: boolean
	/** Log completed actions to the console (client-side). */
	logCompletedActions: boolean
}

const DEFAULT_DEBUG_FLAGS: AgentDebugFlags = {
	logSystemPrompt: false,
	logMessages: false,
	logCompletedActions: false,
}

export class AgentDebugManager extends BaseAgentManager {
	private $debugFlags: Atom<AgentDebugFlags>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$debugFlags = atom<AgentDebugFlags>('debugFlags', DEFAULT_DEBUG_FLAGS)
	}

	getDebugFlags(): AgentDebugFlags {
		return this.$debugFlags.get()
	}

	/** Merges with existing flags. */
	setDebugFlags(flags: Partial<AgentDebugFlags>): void {
		this.$debugFlags.update((current) => ({ ...current, ...flags }))
	}

	toggleFlag(flag: keyof AgentDebugFlags): AgentDebugFlags {
		this.$debugFlags.update((current) => ({ ...current, [flag]: !current[flag] }))
		return this.$debugFlags.get()
	}

	logCompletedAction(action: Streaming<AgentAction>): void {
		if (this.$debugFlags.get().logCompletedActions && action.complete) {
			console.log('[DEBUG] Completed Action:', action)
		}
	}

	reset(): void {
		this.$debugFlags.set(DEFAULT_DEBUG_FLAGS)
	}
}
