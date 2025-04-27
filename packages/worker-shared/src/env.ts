import { getOwnProperty } from '@tldraw/utils'

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
