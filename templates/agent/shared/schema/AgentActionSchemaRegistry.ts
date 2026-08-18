import z from 'zod'

export interface RegisterActionSchemaOptions {
	/** Only use this schema in these modes; otherwise it's the default for the action type. */
	forModes?: string[]
}

const defaultSchemaRegistry = new Map<string, z.ZodType>()
// actionType -> (mode -> schema)
const modeSchemaRegistry = new Map<string, Map<string, z.ZodType>>()

/** Register an action schema (keyed by its `_type` literal). Returns the schema for chaining. */
export function registerActionSchema<T extends z.ZodType>(
	type: string,
	schema: T,
	options?: RegisterActionSchemaOptions
): T {
	const { forModes } = options ?? {}

	if (forModes && forModes.length > 0) {
		let modeMap = modeSchemaRegistry.get(type)
		if (!modeMap) {
			modeMap = new Map()
			modeSchemaRegistry.set(type, modeMap)
		}
		for (const mode of forModes) {
			if (modeMap.has(mode)) {
				throw new Error(`Action schema for ${type} already registered for mode ${mode}`)
			}
			modeMap.set(mode, schema)
		}
	} else {
		if (defaultSchemaRegistry.has(type)) {
			throw new Error(`Action schema already registered: ${type}`)
		}
		defaultSchemaRegistry.set(type, schema)
	}

	return schema
}

/** The mode-specific schema if one exists, otherwise the default. */
export function getActionSchemaForMode(type: string, mode: string): z.ZodType | undefined {
	return modeSchemaRegistry.get(type)?.get(mode) ?? defaultSchemaRegistry.get(type)
}

/** The default schema for an action type, ignoring mode. */
export function getDefaultActionSchema(type: string): z.ZodType | undefined {
	return defaultSchemaRegistry.get(type)
}

export function hasDefaultActionSchema(type: string): boolean {
	return defaultSchemaRegistry.has(type)
}
