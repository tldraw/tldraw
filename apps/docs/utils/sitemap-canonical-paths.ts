/** Public marketing apex — canonical `<link>` and sitemap `<loc>` URLs. */
export const PRODUCTION_SITE_ORIGIN = 'https://tldraw.dev'

/**
 * Paths that 301 or rewrite to a canonical URL. Sitemap and `<link rel="canonical">`
 * must use the canonical path so alias URLs do not dilute link equity.
 */
const DOCS_SITEMAP_PATH_ALIASES: Record<string, string> = {
	'/getting-started/quick-start': '/quick-start',
	'/getting-started/installation': '/installation',
	'/getting-started/releases': '/releases',
	'/releases-versioning': '/releases',
	'/examples': '/examples/basic',
	'/starter-kits': '/starter-kits/overview',
}

function normalizePathname(path: string): string {
	const trimmed = path.trim()
	if (!trimmed || trimmed === '/') return '/'
	const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
	return withLeading.replace(/\/+$/, '') || '/'
}

export function canonicalizeDocsSitemapPath(path: string): string {
	const normalized = normalizePathname(path)
	return DOCS_SITEMAP_PATH_ALIASES[normalized] ?? normalized
}

export function canonicalizeDocsSitemapPaths(paths: string[]): string[] {
	return Array.from(new Set(paths.map(canonicalizeDocsSitemapPath))).sort()
}

/** Absolute canonical URL for a docs article path (alias or canonical). */
export function canonicalDocsPageUrl(pathname: string): string {
	return `${PRODUCTION_SITE_ORIGIN}${canonicalizeDocsSitemapPath(pathname)}`
}
