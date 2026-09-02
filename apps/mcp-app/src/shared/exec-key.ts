/**
 * Rendezvous key for handing the widget's exec result back to the server.
 *
 * The server (from the tool args) and the widget (from the code it executes)
 * derive the same key independently, from the two values both sides are
 * guaranteed to share regardless of how the host routes MCP sessions: the exec
 * `code` and the model-supplied `canvasId`. Used to address the `exec:<key>`
 * CanvasStore rendezvous DO.
 *
 * Folding in the canvasId is what prevents a harmful collision. Two invocations
 * only collide when they hash to the same key, which (SHA-256) means identical
 * code. Identical code on *different* existing canvases would otherwise share a
 * key and could swap results — but those invocations carry different canvasIds,
 * so the key differs. When no canvasId is supplied (a brand-new blank canvas)
 * the key falls back to the code alone; collisions there are harmless because
 * identical code on identical blank canvases produces identical results.
 *
 * Runs in both the Cloudflare worker and the widget (browser).
 */
export async function computeExecKey(code: string, canvasId?: string): Promise<string> {
	const material = canvasId ? `${canvasId}\n${code}` : code
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 32)
}
