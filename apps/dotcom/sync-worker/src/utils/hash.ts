// Hex SHA-256 of a string, for the two places that need a hash to be one-way rather than fast: the
// render token records (utils/renderTokens.ts) hash a token before storing it, and the MCP tool
// (routes/tla/) hashes client IPs before they reach telemetry.
//
// Not `getHashForString` and friends from @tldraw/utils, which are a 32-bit FNV-1a variant and wrong
// for both. A 32-bit digest of an IPv4 address is a lookup table rather than a one-way function, and
// one guarding a token is collision-searchable by anyone holding the signing secret — which is the
// exact attacker the token record exists to stop.
//
// Under utils/ because both callers' layers need it and a utils module must not import a route.
export async function sha256(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
