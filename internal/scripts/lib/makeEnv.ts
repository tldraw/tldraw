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
