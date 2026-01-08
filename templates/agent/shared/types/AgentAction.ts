import z from 'zod'

// ============================================================================
// Type Derivation
// ============================================================================

/**
 * Import all schemas as a namespace for type extraction.
 */
import type * as AllSchemasType from '../schema/AgentActionSchemas'

/** Extract inferred type from a Zod schema */
type ExtractZodType<T> = T extends z.ZodType<infer U> ? U : never

/** Get all values from the schemas module that are ZodTypes */
type SchemaExports = (typeof AllSchemasType)[keyof typeof AllSchemasType]

/** Filter to only Zod types (excludes the type aliases) */
export type AgentActionSchema = Extract<SchemaExports, z.ZodType>

/**
 * Union of all agent action types, automatically derived from exported schemas.
 * When you add a new action schema export to AgentActionSchemas.ts, this type
 * automatically includes it - no arrays or manual type updates needed!
 */
export type AgentAction = ExtractZodType<AgentActionSchema>

// ============================================================================
// Runtime Lookup (built from exports)
// ============================================================================

/** Runtime import of all schemas for building lookup */
import * as AllSchemas from '../schema/AgentActionSchemas'

/** Type guard to check if a value is a Zod object schema with _type */
function isActionSchema(value: unknown): value is z.ZodObject<{ _type: z.ZodLiteral<string> }> {
	if (!(value instanceof z.ZodObject)) return false
	const shape = (value as z.ZodObject<z.ZodRawShape>).shape
	if (!('_type' in shape)) return false
	const typeField = shape._type
	return typeField instanceof z.ZodLiteral
}

/** Extract the _type literal value from a schema */
function getSchemaType(schema: z.ZodObject<{ _type: z.ZodLiteral<string> }>): string {
	return schema.shape._type.value
}

/** Build lookup object from all exported schemas */
const schemasByType: Record<string, AgentActionSchema> = Object.fromEntries(
	Object.values(AllSchemas)
		.filter(isActionSchema)
		.map((schema) => [getSchemaType(schema), schema as AgentActionSchema])
)

/**
 * Get all action schemas.
 */
export function getAllActionSchemas(): AgentActionSchema[] {
	return Object.values(schemasByType)
}

/**
 * Get an action schema by its _type value.
 */
export function getActionSchema(type: string): AgentActionSchema | undefined {
	return schemasByType[type]
}

/**
 * Check if an action schema exists for a given type.
 */
export function hasActionSchema(type: string): boolean {
	return type in schemasByType
}
