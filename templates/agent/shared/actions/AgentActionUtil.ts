import z from 'zod'
import { AgentTransform } from '../AgentTransform'
import { BaseAgentAction } from '../types/BaseAgentAction'
import { ChatHistoryInfo } from '../types/ChatHistoryInfo'
import { Streaming } from '../types/Streaming'

export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

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
	 * Transform the action before saving it to chat history.
	 * Useful for sanitizing or correcting actions.
	 * @returns The transformed action, or null to reject the action
	 */
	sanitizeAction(action: Streaming<T>, _transform: AgentTransform): Streaming<T> | null {
		return action
	}

	/**
	 * Apply the action to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyAction(_action: Streaming<T>, _transform: AgentTransform): Promise<void> | void {
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
	new (): AgentActionUtil<T>
	type: T['_type']
}
