/**
 * Rendezvous key for handing the widget's exec result back to the server.
 *
 * The server (from the tool args) and the widget (from the code it executes)
 * derive the same key independently — the exec code itself is the only value
 * both sides are guaranteed to share regardless of how the host routes MCP
 * sessions. Used to address the `exec:<key>` CanvasStore rendezvous DO.
 *
 * Runs in both the Cloudflare worker and the widget (browser).
 */
export async function computeExecKey(code: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 32)
}
