import z from 'zod'
import {
	getDefaultActionSchema,
	hasDefaultActionSchema,
	registerActionSchema,
} from '../schema/AgentActionSchemaRegistry'

export { getActionSchemaForMode } from '../schema/AgentActionSchemaRegistry'

// The action union is derived from whatever AgentActionSchemas.ts exports, so adding a schema
// export there is all it takes to add an action.
import type * as AllSchemasType from '../schema/AgentActionSchemas'

type ExtractZodType<T> = T extends z.ZodType<infer U> ? U : never
type SchemaExports = (typeof AllSchemasType)[keyof typeof AllSchemasType]

export type AgentActionSchema = Extract<SchemaExports, z.ZodType>
export type AgentAction = ExtractZodType<AgentActionSchema>

import * as AllSchemas from '../schema/AgentActionSchemas'

function isActionSchema(value: unknown): value is z.ZodObject<{ _type: z.ZodLiteral<string> }> {
	return value instanceof z.ZodObject && value.shape._type instanceof z.ZodLiteral
}

const schemasByType: Record<string, AgentActionSchema> = {}
for (const value of Object.values(AllSchemas)) {
	if (!isActionSchema(value)) continue
	const type = value.shape._type.value
	// Several schemas can share a _type (mode-specific variants); the first one exported is the default
	if (hasDefaultActionSchema(type)) continue
	registerActionSchema(type, value)
	schemasByType[type] = value as AgentActionSchema
}

/** All default action schemas (ignoring mode). */
export function getAllActionSchemas(): AgentActionSchema[] {
	return Object.values(schemasByType)
}

/** The default schema for a _type (ignoring mode). */
export function getActionSchema(type: string): AgentActionSchema | undefined {
	return getDefaultActionSchema(type) as AgentActionSchema | undefined
}

export function hasActionSchema(type: string): boolean {
	return type in schemasByType
}

import type { SystemPromptCategory } from './SystemPromptCategory'

/** Metadata attached to action schemas via .meta(). */
export interface ActionMeta {
	title?: string
	description?: string
	_systemPromptCategory?: SystemPromptCategory
}

export function getActionMeta(type: AgentAction['_type']): ActionMeta | undefined {
	const schema = getActionSchema(type)
	if (!schema) return undefined
	return schema.meta() as ActionMeta | undefined
}
