import z from 'zod'

/**
 * Options for registering an action schema.
 */
export interface RegisterActionSchemaOptions {
	/**
	 * If specified, this schema will only be used when the agent is in one of these modes.
	 * Otherwise, it will be the default schema for this action type.
	 */
	forModes?: string[]
}

// Default registry: actionType -> schema (used when no mode-specific schema is registered)
const defaultSchemaRegistry = new Map<string, z.ZodType>()

// Mode registry: actionType -> (mode -> schema) (mode-specific overrides)
const modeSchemaRegistry = new Map<string, Map<string, z.ZodType>>()

/**
 * Register an action schema. Call this for each action type.
 *
 * @param type - The action type (the `_type` literal value).
 * @param schema - The Zod schema for this action.
 * @param options - Optional configuration for mode-specific registration.
 * @returns The schema (for chaining).
 */
export function registerActionSchema<T extends z.ZodType>(
	type: string,
	schema: T,
	options?: RegisterActionSchemaOptions
): T {
	const { forModes } = options ?? {}

	if (forModes && forModes.length > 0) {
		// Mode-specific registration
		if (!modeSchemaRegistry.has(type)) {
			modeSchemaRegistry.set(type, new Map())
		}
		const modeMap = modeSchemaRegistry.get(type)!
		for (const mode of forModes) {
			if (modeMap.has(mode)) {
				throw new Error(`Action schema for ${type} already registered for mode ${mode}`)
			}
			modeMap.set(mode, schema)
		}
	} else {
		// Default registration
		if (defaultSchemaRegistry.has(type)) {
			throw new Error(`Action schema already registered: ${type}`)
		}
		defaultSchemaRegistry.set(type, schema)
	}

	return schema
}

/**
 * Get an action schema for a specific type and mode.
 * Returns the mode-specific schema if one exists, otherwise the default.
 *
 * @param type - The action type to look up.
 * @param mode - The mode to resolve the schema for.
 * @returns The schema, or undefined if not found.
 */
export function getActionSchemaForMode(type: string, mode: string): z.ZodType | undefined {
	// Check for mode-specific schema first
	const modeMap = modeSchemaRegistry.get(type)
	if (modeMap) {
		const modeSchema = modeMap.get(mode)
		if (modeSchema) {
			return modeSchema
		}
	}

	// Fall back to default schema
	return defaultSchemaRegistry.get(type)
}

/**
 * Get the default schema for an action type (ignoring mode).
 *
 * @param type - The action type to look up.
 * @returns The default schema, or undefined if not found.
 */
export function getDefaultActionSchema(type: string): z.ZodType | undefined {
	return defaultSchemaRegistry.get(type)
}

/**
 * Check if a default schema is already registered for a type.
 */
export function hasDefaultActionSchema(type: string): boolean {
	return defaultSchemaRegistry.has(type)
}
