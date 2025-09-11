import { Editor } from 'tldraw'
import z from 'zod'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentHelpers } from '../AgentHelpers'
import { BaseAgentAction } from '../types/BaseAgentAction'
import { ChatHistoryInfo } from '../types/ChatHistoryInfo'
import { Streaming } from '../types/Streaming'

export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

	protected agent?: TldrawAgent
	protected editor?: Editor

	constructor(agent?: TldrawAgent) {
		this.agent = agent
		this.editor = agent?.editor
	}

	/**
	 * Get a schema to use for the model's response.
	 * @returns The schema, or null to not use a schema
	 */
	getSchema(): z.ZodType<T> | null {
		return null
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

	/**
	 * Build a system message that gets concatenated with the other system messages.
	 * @returns The system message, or null to not add anything to the system message.
	 */
	buildSystemPrompt(): string | null {
		return null
	}
}

export interface AgentActionUtilConstructor<T extends BaseAgentAction = BaseAgentAction> {
	new (agent: TldrawAgent, editor: Editor): AgentActionUtil<T>
	type: T['_type']
}
