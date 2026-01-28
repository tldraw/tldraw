import { Atom, atom } from 'tldraw'
import type { AgentAction } from '../../../shared/types/AgentAction'
import type { Streaming } from '../../../shared/types/Streaming'
import type { TldrawAgent } from '../TldrawAgent'

/**
 * Debug flags for controlling logging behavior.
 */
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

/**
 * Manages debug functionality for an agent.
 * Provides flags for controlling logging of system prompts, messages, and actions.
 */
export class AgentDebugManager {
	/**
	 * Debug flags for controlling logging behavior.
	 */
	private $debugFlags: Atom<AgentDebugFlags>

	constructor(public agent: TldrawAgent) {
		this.$debugFlags = atom<AgentDebugFlags>('debugFlags', DEFAULT_DEBUG_FLAGS)
	}

	/**
	 * Get the current debug flags.
	 */
	getDebugFlags(): AgentDebugFlags {
		return this.$debugFlags.get()
	}

	/**
	 * Set debug flags. Merges with existing flags.
	 */
	setDebugFlags(flags: Partial<AgentDebugFlags>): void {
		this.$debugFlags.update((current) => ({ ...current, ...flags }))
	}

	/**
	 * Toggle a specific debug flag.
	 * @returns The updated debug flags.
	 */
	toggleFlag(flag: keyof AgentDebugFlags): AgentDebugFlags {
		this.$debugFlags.update((current) => ({
			...current,
			[flag]: !current[flag],
		}))
		return this.$debugFlags.get()
	}

	/**
	 * Log a completed action if logging is enabled.
	 */
	logCompletedAction(action: Streaming<AgentAction>): void {
		const flags = this.$debugFlags.get()
		if (flags.logCompletedActions && action.complete) {
			console.log('[DEBUG] Completed Action:', action)
		}
	}

	reset(): void {
		this.$debugFlags.set(DEFAULT_DEBUG_FLAGS)
	}

	dispose(): void {
		// No cleanup needed
	}
}
