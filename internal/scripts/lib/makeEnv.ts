export function makeEnv<Keys extends readonly string[]>(keys: Keys): Record {
	const env = {} as Record
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
	return env as Record
}
