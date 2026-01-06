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

const registry = new Map<string, AgentActionUtilConstructor<any>>()

/**
 * Register an agent action util class. Call this after defining each util class.
 */
export function registerActionUtil<T extends AgentActionUtilConstructor<any>>(util: T): T {
	if (registry.has(util.type)) {
		throw new Error(`Agent action util already registered: ${util.type}`)
	}
	registry.set(util.type, util)
	return util
}

/**
 * Get all registered agent action util classes.
 */
export function getAllActionUtils(): AgentActionUtilConstructor<any>[] {
	return Array.from(registry.values())
}

/**
 * Get an object containing instantiated agent action utils for an agent.
 */
export function getAgentActionUtilsRecord(agent: TldrawAgent) {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	for (const util of registry.values()) {
		object[util.type as AgentAction['_type']] = new util(agent)
	}
	return object
}

// ============================================================================
// Base Class
// ============================================================================

export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

	agent?: TldrawAgent
	editor?: Editor

	constructor(agent?: TldrawAgent) {
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
