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
