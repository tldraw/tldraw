import z from 'zod'

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * Shape constraint for action schemas - must have a _type literal field.
 */
interface ActionSchemaShape {
	_type: z.ZodLiteral<string>
	[key: string]: z.ZodType
}

/**
 * Internal registry for action schemas.
 * Schemas register themselves when their module is imported.
 */
const registry = new Map<string, z.ZodObject<ActionSchemaShape>>()

/**
 * Register an action schema. Call this when defining each action.
 * Returns the schema for convenient chaining/export.
 *
 * @example
 * export const MyAction = registerActionSchema(
 *   z.object({
 *     _type: z.literal('myAction'),
 *     // ...
 *   }).meta({ title: 'My Action', description: '...' })
 * )
 */
export function registerActionSchema<S extends ActionSchemaShape, T extends z.ZodObject<S>>(
	schema: T
): T {
	// Extract the _type literal from the schema using Zod 4's structure
	// In Zod 4, object schemas have a .shape property with the fields
	const shape = schema.shape
	const typeField = shape._type

	// In Zod 4, z.literal has a .value property that returns the literal value
	const typeLiteral = typeField.value

	if (!typeLiteral) {
		throw new Error('Action schema must have a _type literal field')
	}

	if (registry.has(typeLiteral)) {
		throw new Error(`Action schema already registered: ${typeLiteral}`)
	}

	registry.set(typeLiteral, schema)
	return schema
}

/**
 * Get all registered action schemas.
 * Use this in buildResponseSchema() to construct the union.
 */
export function getAllActionSchemas(): AgentActionSchema[] {
	return Array.from(registry.values()) as AgentActionSchema[]
}

/**
 * Get an action schema by its _type value.
 */
export function getActionSchema(type: string): AgentActionSchema | undefined {
	return registry.get(type) as AgentActionSchema | undefined
}

/**
 * Check if an action schema exists for a given type.
 */
export function hasActionSchema(type: string): boolean {
	return registry.has(type)
}

// ============================================================================
// Type Derivation
// ============================================================================

/**
 * Import all schemas as a namespace for type extraction.
 * This is a type-only import to avoid circular dependencies.
 */
import type * as AllSchemas from '../schema/AgentActionSchemas'

/** Extract inferred type from a Zod schema */
type ExtractZodType<T> = T extends z.ZodType<infer U> ? U : never

/** Get all values from the schemas module that are ZodTypes */
type SchemaExports = (typeof AllSchemas)[keyof typeof AllSchemas]

/** Filter to only Zod types (excludes the type aliases) */
export type AgentActionSchema = Extract<SchemaExports, z.ZodType>

/**
 * Union of all agent action types, automatically derived from exported schemas.
 * When you add a new action schema export to AgentActionSchemas.ts, this type
 * automatically includes it - no arrays or manual type updates needed!
 */
export type AgentAction = ExtractZodType<AgentActionSchema>
