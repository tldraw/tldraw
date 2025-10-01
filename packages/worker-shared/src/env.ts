import { getOwnProperty } from '@tldraw/utils'

/**
 * Validates that specified environment variables are present and non-nullish in the provided environment object.
 * Throws an error if any required variables are missing, otherwise returns the environment with guaranteed
 * non-nullable types for the specified keys.
 *
 * @param env - The environment object containing potential environment variables
 * @param keys - An object specifying which keys from the environment are required, where each key maps to `true`
 * @returns The environment object with type-safe guarantees that the specified keys are non-null and defined
 * @throws Error When any of the specified required environment variables are undefined
 *
 * @example
 * ```typescript
 * interface MyEnv {
 *   readonly DATABASE_URL?: string
 *   readonly API_KEY?: string
 *   readonly OPTIONAL_VAR?: string
 * }
 *
 * const env: MyEnv = {
 *   DATABASE_URL: 'postgres://...',
 *   API_KEY: 'secret-key',
 *   // OPTIONAL_VAR is undefined
 * }
 *
 * // Validate only the required variables
 * const config = requiredEnv(env, {
 *   DATABASE_URL: true,
 *   API_KEY: true,
 * })
 *
 * // config.DATABASE_URL and config.API_KEY are now guaranteed to be strings
 * console.log(config.DATABASE_URL) // TypeScript knows this is string, not string | undefined
 * ```
 *
 * @public
 */
export function requiredEnv<T extends object>(
	env: T,
	keys: { [K in keyof T]: true }
): { [K in keyof T]-?: NonNullable<T[K]> } {
	for (const key of Object.keys(keys)) {
		if (getOwnProperty(env, key) === undefined) {
			throw new Error(`Missing required env var: ${key}`)
		}
	}
	return env as any
}
