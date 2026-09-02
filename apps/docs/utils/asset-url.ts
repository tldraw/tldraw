/**
 * Resolves root-relative static URLs (`/images/...`, `/favicon.svg`) to absolute URLs when the
 * docs app is deployed with `assetPrefix` (e.g. proxied via tldraw.dev per RUNBOOK). Next applies
 * `assetPrefix` to `/_next/*` automatically; strings in MDX remain plain paths unless we prefix them.
 *
 * Precedence (first hit wins):
 * 1. `ASSET_PREFIX` — server/build (Vercel / CI)
 * 2. `NEXT_PUBLIC_ASSET_PREFIX` — same value inlined for client bundles when needed
 * 3. `NEXT_PUBLIC_DOCS_ASSET_PREFIX` — alias for ops clarity (same behavior as #2)
 * 4. `VERCEL_URL` — preview deployments
 * 5. `NEXT_PUBLIC_VERCEL_URL` — client-side fallback for preview hostname
 */
function resolveAssetOrigin(): string | undefined {
	const explicit =
		process.env.ASSET_PREFIX?.trim() ||
		process.env.NEXT_PUBLIC_ASSET_PREFIX?.trim() ||
		process.env.NEXT_PUBLIC_DOCS_ASSET_PREFIX?.trim()
	if (explicit) return explicit.replace(/\/$/, '')

	const vercelUrl = process.env.VERCEL_URL?.trim() || process.env.NEXT_PUBLIC_VERCEL_URL?.trim()
	if (vercelUrl) {
		const host = vercelUrl.replace(/^https?:\/\//, '')
		return `https://${host}`
	}

	return undefined
}

/**
 * Prefix a root-relative public/static path for the current docs deployment.
 * Use for MDX images, icons in metadata, and any `/…` URL that must load from the docs origin
 * when the site is served behind a proxy or alternate host.
 */
export function assetUrl(path: string): string {
	if (path.startsWith('//')) return path
	if (!path.startsWith('/')) return path
	const origin = resolveAssetOrigin()
	if (!origin) return path
	return `${origin}${path}`
}
