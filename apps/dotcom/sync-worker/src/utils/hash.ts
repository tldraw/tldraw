// Hex SHA-256 of a string, for the places that need collision resistance rather than speed: render
// token records hash a token before storing it, MCP telemetry hashes caller ids, and the MCP cluster
// cache hashes the snapshot bytes whose measurements it stores.
//
// Not `getHashForString` and friends from @tldraw/utils, which are a 32-bit FNV-1a variant and wrong
// here. A 32-bit digest of an IPv4 address is a lookup table rather than a one-way function, one
// guarding a token is collision-searchable by anyone holding the signing secret, and one keying the
// cluster cache could confuse measurements from different snapshots.
//
// Under utils/ because these callers span layers and a utils module must not import a route.
export async function sha256(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
