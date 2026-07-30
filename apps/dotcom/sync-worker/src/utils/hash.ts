// Hex SHA-256 of a string. Lives under utils/ rather than beside either caller because both layers
// need it: the render token records (utils/renderTokens.ts) hash a token before storing it, and the
// MCP tool (routes/tla/) hashes client IPs before they reach telemetry. A utils module must not
// depend on a route module, so putting it here is what keeps the one implementation shared.
export async function sha256(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
