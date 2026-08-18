import { Editor } from 'tldraw'
import { AgentAction } from '../../shared/types/AgentAction'
import { BaseAgentAction } from '../../shared/types/BaseAgentAction'
import { ChatHistoryInfo } from '../../shared/types/ChatHistoryInfo'
import { Streaming } from '../../shared/types/Streaming'
import { TldrawAgent } from '../agent/TldrawAgent'
import { AgentHelpers } from '../AgentHelpers'

export interface RegisterActionUtilOptions {
	/**
	 * If specified, this util will only be used when the agent is in one of these modes.
	 * Otherwise, it will be the default util for this action type.
	 */
	forModes?: string[]
}

// actionType -> util
const defaultRegistry = new Map<string, AgentActionUtilConstructor<BaseAgentAction>>()
// actionType -> (mode -> util), overriding the default for that mode
const modeRegistry = new Map<string, Map<string, AgentActionUtilConstructor<BaseAgentAction>>>()

/**
 * Register an agent action util class. Call this after defining each util class.
 */
export function registerActionUtil<T extends AgentActionUtilConstructor<BaseAgentAction>>(
	util: T,
	options?: RegisterActionUtilOptions
): T {
	const { forModes } = options ?? {}

	if (forModes && forModes.length > 0) {
		let modeMap = modeRegistry.get(util.type)
		if (!modeMap) {
			modeMap = new Map()
			modeRegistry.set(util.type, modeMap)
		}
		for (const mode of forModes) {
			if (modeMap.has(mode)) {
				throw new Error(`Action util for ${util.type} already registered for mode ${mode}`)
			}
			modeMap.set(mode, util)
		}
	} else {
		if (defaultRegistry.has(util.type)) {
			throw new Error(`Agent action util already registered: ${util.type}`)
		}
		defaultRegistry.set(util.type, util)
	}

	return util
}

/**
 * Instantiate the action utils for an agent, resolved for a specific mode.
 * Mode-specific utils override defaults.
 */
export function getAgentActionUtilsRecordForMode(agent: TldrawAgent, mode: string) {
	const object = {} as Record<AgentAction['_type'], AgentActionUtil<AgentAction>>

	for (const [type, util] of defaultRegistry.entries()) {
		object[type as AgentAction['_type']] = new util(agent) as AgentActionUtil<AgentAction>
	}

	for (const [type, modeMap] of modeRegistry.entries()) {
		const modeUtil = modeMap.get(mode)
		if (modeUtil) {
			object[type as AgentAction['_type']] = new modeUtil(agent) as AgentActionUtil<AgentAction>
		}
	}

	return object
}

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
	 */
	getInfo(_action: Streaming<T>): Partial<ChatHistoryInfo> | null {
		return {}
	}

	/**
	 * Transforms the action before saving it to chat history.
	 * @returns The transformed action, or null to reject the action
	 */
	sanitizeAction(action: Streaming<T>, _helpers: AgentHelpers): Streaming<T> | null {
		return action
	}

	/**
	 * Apply the action to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyAction(_action: Streaming<T>, _helpers: AgentHelpers): Promise<void> | void {}

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
