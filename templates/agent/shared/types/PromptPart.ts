import type { AgentModelName } from '../models'
import type { AgentMessage } from './AgentMessage'
import type { BasePromptPart } from './BasePromptPart'

// ============================================================================
// Prompt Part Definition Interface
// ============================================================================

/**
 * A prompt part definition contains pure transformation functions for converting
 * prompt part data into messages, content, or system prompts.
 */
export interface PromptPartDefinition<T extends BasePromptPart> {
	/**
	 * The unique type of the prompt part.
	 */
	type: T['type']

	/**
	 * The priority of the prompt part. Higher priority = later in the prompt.
	 */
	priority?: number

	/**
	 * Override the default buildContent function to choose which content to send to the model.
	 * Gives you less control than buildMessages, but is much simpler to use.
	 */
	buildContent?(part: T): string[]

	/**
	 * Override the default buildMessages function to choose how to turn content into AgentMessages.
	 */
	buildMessages?(part: T): AgentMessage[]

	/**
	 * Override the default getModelName function to choose which model to use for the prompt part.
	 */
	getModelName?(part: T): AgentModelName | null
}

// ============================================================================
// Type Derivation
// ============================================================================

/**
 * Import all definitions as a namespace for type extraction.
 */
import type * as AllDefinitionsType from '../schema/PromptPartDefinitions'

/** Extract the prompt part type from a definition */
type ExtractPromptPart<T> = T extends PromptPartDefinition<infer U> ? U : never

/** Get all values from the definitions module that are PromptPartDefinitions */
type DefinitionExports = (typeof AllDefinitionsType)[keyof typeof AllDefinitionsType]

/** Filter to only PromptPartDefinition types (excludes type aliases and other exports) */
export type PromptPartDefinitionType = Extract<
	DefinitionExports,
	PromptPartDefinition<BasePromptPart>
>

/**
 * Union of all prompt part types, automatically derived from exported definitions.
 * When you add a new definition export to PromptPartDefinitions.ts, this type
 * automatically includes it - no arrays or manual type updates needed!
 */
export type PromptPart = ExtractPromptPart<PromptPartDefinitionType>

// ============================================================================
// Runtime Lookup (built from exports)
// ============================================================================

/** Runtime import of all definitions for building lookup */
import * as AllDefinitions from '../schema/PromptPartDefinitions'

/** Type guard to check if a value is a PromptPartDefinition */
function isPromptPartDefinition(value: unknown): value is PromptPartDefinition<BasePromptPart> {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof value !== 'function' &&
		'type' in value &&
		typeof (value as PromptPartDefinition<BasePromptPart>).type === 'string'
	)
}

/** Build lookup object from all exported definitions */
const definitionsByType: Record<string, PromptPartDefinition<BasePromptPart>> = Object.fromEntries(
	(
		Object.values(AllDefinitions).filter(
			isPromptPartDefinition
		) as PromptPartDefinition<BasePromptPart>[]
	).map((def) => [def.type, def])
)

/**
 * Get a prompt part definition by its type.
 */
export function getPromptPartDefinition(type: string): PromptPartDefinition<PromptPart> {
	const definition = definitionsByType[type]
	if (!definition) {
		throw new Error(`No prompt part definition found for type: ${type}`)
	}
	return definition as PromptPartDefinition<PromptPart>
}

/**
 * Check if a prompt part definition exists for a given type.
 */
export function hasPromptPartDefinition(type: string): boolean {
	return type in definitionsByType
}

/**
 * Get all prompt part definitions.
 */
export function getAllPromptPartDefinitions(): PromptPartDefinition<PromptPart>[] {
	return Object.values(definitionsByType) as PromptPartDefinition<PromptPart>[]
}

/**
 * Get all available prompt part types.
 */
export function getAllPromptPartTypes(): string[] {
	return Object.keys(definitionsByType)
}
