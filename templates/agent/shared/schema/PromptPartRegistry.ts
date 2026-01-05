import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPart } from '../types/PromptPart'
import {
	BlurryShapesPartDefinition,
	ChatHistoryPartDefinition,
	ContextItemsPartDefinition,
	DataPartDefinition,
	MessagesPartDefinition,
	ModelNamePartDefinition,
	PeripheralShapesPartDefinition,
	PromptPartDefinition,
	ScreenshotPartDefinition,
	SelectedShapesPartDefinition,
	SystemPromptPartDefinition,
	TimePartDefinition,
	TodoListPartDefinition,
	UserActionHistoryPartDefinition,
	ViewportBoundsPartDefinition,
} from './PromptPartDefinitions'

/**
 * Central registry of all prompt part definitions.
 * These are used by the worker to build messages and system prompts.
 */
export const PROMPT_PART_DEFINITIONS = [
	// Model
	SystemPromptPartDefinition,
	ModelNamePartDefinition,

	// Request
	MessagesPartDefinition,
	DataPartDefinition,
	ContextItemsPartDefinition,

	// Viewport
	ScreenshotPartDefinition,
	ViewportBoundsPartDefinition,

	// Shapes
	BlurryShapesPartDefinition,
	PeripheralShapesPartDefinition,
	SelectedShapesPartDefinition,

	// History
	ChatHistoryPartDefinition,
	UserActionHistoryPartDefinition,
	TodoListPartDefinition,

	// Metadata
	TimePartDefinition,
] as const satisfies ReadonlyArray<PromptPartDefinition<BasePromptPart>>

/**
 * Get a prompt part definition by its type.
 */
export function getPromptPartDefinition<T extends PromptPart>(
	type: T['type']
): PromptPartDefinition<T> {
	const definition = PROMPT_PART_DEFINITIONS.find((d) => d.type === type)
	if (!definition) {
		throw new Error(`No prompt part definition found for type: ${type}`)
	}
	return definition as PromptPartDefinition<T>
}

/**
 * Check if a prompt part definition exists for a given type.
 */
export function hasPromptPartDefinition(type: string): boolean {
	return PROMPT_PART_DEFINITIONS.some((d) => d.type === type)
}

/**
 * Get all available prompt part types.
 */
export function getAllPromptPartTypes(): Array<PromptPart['type']> {
	return PROMPT_PART_DEFINITIONS.map((d) => d.type)
}
