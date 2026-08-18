import type { AgentModelName } from '../models'
import type { AgentMessage } from './AgentMessage'
import type { BasePromptPart } from './BasePromptPart'

/**
 * Pure transformations from a prompt part's data into messages, content, or a model choice.
 */
export interface PromptPartDefinition<T extends BasePromptPart> {
	type: T['type']

	/** Higher priority = later in the prompt. */
	priority?: number

	/** Simpler than buildMessages: return the strings to send to the model. */
	buildContent?(part: T): string[]

	/** Full control over how the part becomes AgentMessages. */
	buildMessages?(part: T): AgentMessage[]

	getModelName?(part: T): AgentModelName | null
}

// The part union is derived from whatever PromptPartDefinitions.ts exports, so adding a definition
// export there is all it takes to add a part.
import type * as AllDefinitionsType from '../schema/PromptPartDefinitions'

type ExtractPromptPart<T> = T extends PromptPartDefinition<infer U> ? U : never
type DefinitionExports = (typeof AllDefinitionsType)[keyof typeof AllDefinitionsType]

export type PromptPartDefinitionType = Extract<
	DefinitionExports,
	PromptPartDefinition<BasePromptPart>
>
export type PromptPart = ExtractPromptPart<PromptPartDefinitionType>

import * as AllDefinitions from '../schema/PromptPartDefinitions'

function isPromptPartDefinition(value: unknown): value is PromptPartDefinition<BasePromptPart> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		typeof (value as PromptPartDefinition<BasePromptPart>).type === 'string'
	)
}

const definitionsByType: Record<string, PromptPartDefinition<BasePromptPart>> = Object.fromEntries(
	Object.values(AllDefinitions)
		.filter(isPromptPartDefinition)
		.map((def) => [def.type, def])
)

export function getPromptPartDefinition(type: string): PromptPartDefinition<PromptPart> {
	const definition = definitionsByType[type]
	if (!definition) {
		throw new Error(`No prompt part definition found for type: ${type}`)
	}
	return definition as PromptPartDefinition<PromptPart>
}

export function hasPromptPartDefinition(type: string): boolean {
	return type in definitionsByType
}

export function getAllPromptPartDefinitions(): PromptPartDefinition<PromptPart>[] {
	return Object.values(definitionsByType) as PromptPartDefinition<PromptPart>[]
}

export function getAllPromptPartTypes(): string[] {
	return Object.keys(definitionsByType)
}
