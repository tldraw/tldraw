import { Editor } from 'tldraw'
import { AgentModelName } from '../../shared/models'
import { AgentMessage, AgentMessageContent } from '../../shared/types/AgentMessage'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { BasePromptPart } from '../../shared/types/BasePromptPart'
import { PromptPart } from '../../shared/types/PromptPart'
import { TldrawAgent } from '../agent/TldrawAgent'
import { AgentHelpers } from '../AgentHelpers'

// ============================================================================
// Registry
// ============================================================================

const registry = new Map<string, PromptPartUtilConstructor<BasePromptPart>>()

/**
 * Register a prompt part util class. Call this after defining each util class.
 */
export function registerPromptPartUtil<T extends PromptPartUtilConstructor<BasePromptPart>>(
	util: T
): T {
	if (registry.has(util.type)) {
		throw new Error(`Prompt part util already registered: ${util.type}`)
	}
	registry.set(util.type, util)
	return util
}

/**
 * Get all registered prompt part util classes.
 */
export function getAllPromptPartUtils(): PromptPartUtilConstructor<PromptPart>[] {
	return Array.from(registry.values()) as PromptPartUtilConstructor<PromptPart>[]
}

/**
 * Get an object containing instantiated prompt part utils for an agent.
 */
export function getPromptPartUtilsRecord(agent: TldrawAgent) {
	const object = {} as Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	for (const util of registry.values()) {
		object[util.type as PromptPart['type']] = new util(agent) as PromptPartUtil<PromptPart>
	}
	return object
}

// ============================================================================
// Base Class
// ============================================================================

export abstract class PromptPartUtil<T extends BasePromptPart = BasePromptPart> {
	static type: string

	agent?: TldrawAgent
	editor?: Editor

	constructor(agent?: TldrawAgent) {
		this.agent = agent
		this.editor = agent?.editor
	}

	/**
	 * Get some data to add to the prompt.
	 * @returns The prompt part.
	 */
	abstract getPart(request: AgentRequest, helpers: AgentHelpers): Promise<T> | T

	/**
	 * Get priority for this prompt part to determine its position in the prompt.
	 * Lower numbers have higher priority.
	 *
	 * This function gets used by the default `buildMessages` function.
	 * @returns The priority.
	 */
	getPriority(_part: T): number {
		return 0
	}

	/**
	 * Get the name of the model to use for this generation.
	 * @returns The model name, or null to not use a model name.
	 */
	getModelName(_part: T): AgentModelName | null {
		// TODO: This should be extended to return some kind of priority or method for selecting which model to use if there are multiple prompt parts overriding this. Right now, in getModelName.ts, we just return the first model name that is not null.
		return null
	}

	/**
	 * Build an array of text or image content for this prompt part.
	 *
	 * This function gets used by the default `buildMessages` function.
	 * @returns An array of text or image content.
	 */
	buildContent(_part: T): string[] {
		return []
	}

	/**
	 * Build an array of messages to send to the model.
	 * Note: Overriding this function can bypass the `buildContent` and `getPriority` functions.
	 *
	 * @returns An array of messages.
	 */
	buildMessages(part: T): AgentMessage[] {
		const content = this.buildContent(part)
		if (!content || content.length === 0) {
			return []
		}

		const messageContent: AgentMessageContent[] = []
		for (const item of content) {
			if (typeof item === 'string' && item.startsWith('data:image/')) {
				messageContent.push({
					type: 'image',
					image: item,
				})
			} else {
				messageContent.push({
					type: 'text',
					text: item,
				})
			}
		}

		return [{ role: 'user', content: messageContent, priority: this.getPriority(part) }]
	}
}

export interface PromptPartUtilConstructor<T extends BasePromptPart = BasePromptPart> {
	new (agent: TldrawAgent): PromptPartUtil<T>
	type: T['type']
}
