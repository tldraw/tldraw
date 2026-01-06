import z from 'zod'

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * Internal registry for action schemas.
 * Schemas register themselves when their module is imported.
 */
const registry = new Map<string, z.ZodType>()

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
export function registerActionSchema<T extends z.ZodType>(schema: T): T {
	// Extract the _type literal from the schema using Zod 4's structure
	// In Zod 4, object schemas have a .shape property with the fields
	const shape = (schema as any).shape
	const typeField = shape?._type

	// In Zod 4, z.literal has a .value property that returns the literal value
	const typeLiteral = typeField?.value

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
export function getAllActionSchemas(): z.ZodType[] {
	return Array.from(registry.values())
}

/**
 * Get an action schema by its _type value.
 */
export function getActionSchema(type: string): z.ZodType | undefined {
	return registry.get(type)
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
type ZodSchemaExports = Extract<SchemaExports, z.ZodType>

/**
 * Union of all agent action types, automatically derived from exported schemas.
 * When you add a new action schema export to AgentActionSchemas.ts, this type
 * automatically includes it - no arrays or manual type updates needed!
 */
export type AgentAction = ExtractZodType<ZodSchemaExports>
