import {
	AgentActionInfo,
	AgentHelpers,
	BaseAgentAction,
	Streaming,
	TldrawFairyAgent,
} from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'

export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

	protected agent: TldrawFairyAgent
	protected editor: Editor

	constructor(agent: TldrawFairyAgent) {
		this.agent = agent
		this.editor = agent.editor
	}

	/**
	 * Get information about the action to display within the chat history UI.
	 * Return null to not show anything.
	 * Defaults to the stringified action if not set.
	 */
	getInfo(_action: Streaming<T>): Partial<AgentActionInfo> | null {
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
	 * @returns An optional object containing a promise and/or coordinates to move the fairy to
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
	new (agent: TldrawFairyAgent, editor: Editor): AgentActionUtil<T>
	type: T['_type']
}
