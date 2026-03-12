import { Editor } from 'tldraw'
import { AgentAction } from '../../shared/types/AgentAction'
import { BaseAgentAction } from '../../shared/types/BaseAgentAction'
import { ChatHistoryInfo } from '../../shared/types/ChatHistoryInfo'
import { Streaming } from '../../shared/types/Streaming'
import { TldrawAgent } from '../agent/TldrawAgent'
import { AgentHelpers } from '../AgentHelpers'

// ============================================================================
// Registry
// ============================================================================

/**
 * Options for registering an action util.
 */
export interface RegisterActionUtilOptions {
	/**
	 * If specified, this util will only be used when the agent is in one of these modes.
	 * Otherwise, it will be the default util for this action type.
	 */
	forModes?: string[]
}

// Default registry: actionType -> util (used when no mode-specific util is registered)
const defaultRegistry = new Map<string, AgentActionUtilConstructor<BaseAgentAction>>()

// Mode registry: actionType -> (mode -> util) (mode-specific overrides)
const modeRegistry = new Map<string, Map<string, AgentActionUtilConstructor<BaseAgentAction>>>()

/**
 * Register an agent action util class. Call this after defining each util class.
 *
 * @param util - The action util class to register.
 * @param options - Optional configuration for mode-specific registration.
 * @returns The registered util class.
 */
export function registerActionUtil<T extends AgentActionUtilConstructor<BaseAgentAction>>(
	util: T,
	options?: RegisterActionUtilOptions
): T {
	const { forModes } = options ?? {}

	if (forModes && forModes.length > 0) {
		// Mode-specific registration
		if (!modeRegistry.has(util.type)) {
			modeRegistry.set(util.type, new Map())
		}
		const modeMap = modeRegistry.get(util.type)!
		for (const mode of forModes) {
			if (modeMap.has(mode)) {
				throw new Error(`Action util for ${util.type} already registered for mode ${mode}`)
			}
			modeMap.set(mode, util)
		}
	} else {
		// Default registration (existing behavior)
		if (defaultRegistry.has(util.type)) {
			throw new Error(`Agent action util already registered: ${util.type}`)
		}
		defaultRegistry.set(util.type, util)
	}

	return util
}

/**
 * Get all registered agent action util classes.
 * Returns both default and mode-specific utils (deduplicated).
 */
export function getAllActionUtils(): AgentActionUtilConstructor<AgentAction>[] {
	const allUtils = new Set<AgentActionUtilConstructor<BaseAgentAction>>()

	// Add all default utils
	for (const util of defaultRegistry.values()) {
		allUtils.add(util)
	}

	// Add all mode-specific utils
	for (const modeMap of modeRegistry.values()) {
		for (const util of modeMap.values()) {
			allUtils.add(util)
		}
	}

	return Array.from(allUtils) as AgentActionUtilConstructor<AgentAction>[]
}

/**
 * Get an object containing instantiated agent action utils for an agent,
 * resolved for a specific mode. Mode-specific utils override defaults.
 *
 * @param agent - The agent to create utils for.
 * @param mode - The mode to resolve utils for.
 * @returns A record of action utils keyed by action type.
 */
export function getAgentActionUtilsRecordForMode(agent: TldrawAgent, mode: string) {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	// Start with defaults
	for (const [type, util] of defaultRegistry.entries()) {
		object[type as AgentAction['_type']] = new util(agent) as AgentActionUtil<AgentAction>
	}

	// Override with mode-specific utils
	for (const [type, modeMap] of modeRegistry.entries()) {
		const modeUtil = modeMap.get(mode)
		if (modeUtil) {
			object[type as AgentAction['_type']] = new modeUtil(agent) as AgentActionUtil<AgentAction>
		}
	}

	return object
}

// ============================================================================
// Base Class
// ============================================================================

export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

	agent: TldrawAgent
	editor: Editor

	constructor(agent: TldrawAgent) {
		this.agent = agent
		this.editor = agent?.editor
	}

	/**
	 * Get information about the action to display within the chat history UI.
	 * Return null to not show anything.
	 * Defaults to the stringified action if not set.
	 */
	getInfo(_action: Streaming<T>): Partial<ChatHistoryInfo> | null {
		return {}
	}

	/**
	 * Transforms the action before saving it to chat history.
	 * Useful for sanitizing or correcting actions.
	 * @returns The transformed action, or null to reject the action
	 */
	sanitizeAction(action: Streaming<T>, _helpers: AgentHelpers): Streaming<T> | null {
		return action
	}

	/**
	 * Apply the action to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyAction(_action: Streaming<T>, _helpers: AgentHelpers): Promise<void> | void {
		// Do nothing by default
	}

	/**
	 * Whether the action gets saved to history.
	 */
	savesToHistory(): boolean {
		return true
	}
}

export interface AgentActionUtilConstructor<T extends BaseAgentAction = BaseAgentAction> {
	new (agent: TldrawAgent): AgentActionUtil<T>
	type: T['_type']
}
