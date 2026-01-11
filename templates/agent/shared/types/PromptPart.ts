import type { AgentModelName } from '../models'
import type { AgentMessage } from './AgentMessage'

// ============================================================================
// Prompt Part Definition Interface
// ============================================================================

/**
 * A prompt part definition contains pure transformation functions for converting
 * prompt part data into messages, content, or system prompts.
 */
export interface PromptPartDefinition<T extends { type: string }> {
	type: T['type']
	priority?: number
	buildContent?(part: T): string[]
	buildMessages?(part: T): AgentMessage[]
	getModelName?(part: T): AgentModelName | null
}

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * Internal registry map for prompt part definitions.
 * Definitions register themselves when their module is imported.
 */
const registry = new Map<string, PromptPartDefinition<any>>()

/**
 * Register a prompt part definition. Call this as a side effect when defining
 * each prompt part. Returns the definition for convenient export.
 *
 * @example
 * export const MyPartDefinition = registerPromptPart({
 *   type: 'myPart',
 *   buildContent: (part) => [...],
 * })
 */
export function registerPromptPart<T extends { type: string }>(
	definition: PromptPartDefinition<T>
): PromptPartDefinition<T> {
	if (registry.has(definition.type)) {
		throw new Error(`Prompt part definition already registered: ${definition.type}`)
	}
	registry.set(definition.type, definition)
	return definition
}

/**
 * Get a prompt part definition by its type.
 */
export function getPromptPartDefinition(type: string): PromptPartDefinition<any> {
	const definition = registry.get(type)
	if (!definition) {
		throw new Error(`No prompt part definition found for type: ${type}`)
	}
	return definition
}

/**
 * Check if a prompt part definition exists for a given type.
 */
export function hasPromptPartDefinition(type: string): boolean {
	return registry.has(type)
}

/**
 * Get all registered prompt part definitions.
 */
export function getAllPromptPartDefinitions(): PromptPartDefinition<any>[] {
	return Array.from(registry.values())
}

/**
 * Get all available prompt part types.
 */
export function getAllPromptPartTypes(): string[] {
	return Array.from(registry.keys())
}

// ============================================================================
// Type Derivation
// ============================================================================

/**
 * Import all definitions as a namespace for type extraction.
 * This is a type-only import to avoid circular dependencies.
 */
import type * as AllDefinitions from '../schema/PromptPartDefinitions'

/** Extract the prompt part type from a definition */
type ExtractPromptPart<T> = T extends PromptPartDefinition<infer U> ? U : never

/** Get all values from the definitions module that are PromptPartDefinitions */
type DefinitionExports = (typeof AllDefinitions)[keyof typeof AllDefinitions]

/**
 * Union of all prompt part types, automatically derived from exported definitions.
 * When you add a new definition export to PromptPartDefinitions.ts, this type
 * automatically includes it - no arrays or manual type updates needed!
 */
export type PromptPart = ExtractPromptPart<DefinitionExports>
