// Leaf helpers shared by the thumbnail/OG-image surfaces (sharedBoardScreenshotMcp.ts, the OG
// route, and the OG queue consumer). This module imports nothing from those route files so it can
// be depended on from any of them without creating an import cycle.

// Hex SHA-256 of a string. Used to hash IPs and board slugs before they reach telemetry, so raw
// identifiers are never written to the analytics dataset.
export async function sha256(value: string) {
	const bytes = new TextEncoder().encode(value)
	const digest = await crypto.subtle.digest('SHA-256', bytes)
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Maps an arbitrary render error to a bounded set of reason codes for the `failure` telemetry
// blob. Raw `error.message` strings (Postgres/R2/network/browser errors) are unbounded and would
// blow up that dimension's cardinality, so they must never be written to the dataset directly — the
// full message goes to the caller-facing error text instead. Keep this a small, stable vocabulary.
export function classifyScreenshotFailure(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error)
	if (/not configured/i.test(message)) return 'not_configured'
	if (/timeout|timed out/i.test(message)) return 'browser_timeout'
	if (/empty screenshot/i.test(message)) return 'empty_render'
	if (/Browser Rendering screenshot failed/i.test(message)) return 'browser_failed'
	return 'render_error'
}
