export function makeEnv<const Keys extends readonly string[]>(
	keys: Keys
): Record<Keys[number], string> {
	const env = {} as Record<string, string>
	const missingVars = []
	for (const key of keys) {
		const value = process.env[key]
		if (value === undefined) {
			missingVars.push(key)
			continue
		}
		env[key] = value
	}
	if (missingVars.length > 0) {
		throw new Error(`Missing environment variables: ${missingVars.join(', ')}`)
	}
	return env as Record<Keys[number], string>
}

export function makeEnv2<Obj extends Record<string, boolean>>(
	obj: Obj
): {
	[K in keyof Obj]: Obj[K] extends false ? null | string : string
} {
	const env = {} as Record<string, string | null>
	const missingVars = []
	for (const key in obj) {
		if (!obj[key]) continue
		const value = process.env[key]
		if (value === undefined) {
			missingVars.push(key)
			continue
		}
		env[key] = value
	}
	if (missingVars.length > 0) {
		throw new Error(`Missing environment variables: ${missingVars.join(', ')}`)
	}
	return env as any
}
