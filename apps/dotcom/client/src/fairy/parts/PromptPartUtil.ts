import { AgentRequest, PromptPart } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { FairyAgent } from '../fairy-agent/agent/FairyAgent'

export abstract class PromptPartUtil<T extends PromptPart> {
	static type: PromptPart['type']

	protected agent: FairyAgent
	protected editor: Editor

	constructor(agent: FairyAgent) {
		this.agent = agent
		this.editor = agent.editor
	}

	/**
	 * Get some data to add to the prompt.
	 * @returns The prompt part.
	 */
	abstract getPart(request: AgentRequest, helpers: AgentHelpers): Promise<T> | T
}

export interface PromptPartUtilConstructor<T extends PromptPart> {
	new (agent: FairyAgent): PromptPartUtil<T>
	type: T['type']
}
