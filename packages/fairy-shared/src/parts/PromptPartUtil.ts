import { Editor } from '@tldraw/editor'
import { AgentHelpers } from '../AgentHelpers'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { TldrawFairyAgent } from '../types/TldrawFairyAgent'

export abstract class PromptPartUtil<T extends BasePromptPart = BasePromptPart> {
	static type: string

	protected agent: TldrawFairyAgent
	protected editor: Editor

	constructor(agent: TldrawFairyAgent) {
		this.agent = agent
		this.editor = agent.editor
	}

	/**
	 * Get some data to add to the prompt.
	 * @returns The prompt part.
	 */
	abstract getPart(request: AgentRequest, helpers: AgentHelpers): Promise<T> | T
}

export interface PromptPartUtilConstructor<T extends BasePromptPart = BasePromptPart> {
	new (agent: TldrawFairyAgent): PromptPartUtil<T>
	type: T['type']
}
