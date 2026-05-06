function resolveAssetOrigin(): string | undefined {
	const explicit = process.env.ASSET_PREFIX?.trim()
	if (explicit) return explicit.replace(/\/$/, '')

	const vercelUrl = process.env.VERCEL_URL?.trim()
	if (vercelUrl) return `https://${vercelUrl}`

	return undefined
}

export function assetUrl(path: string): string {
	if (!path.startsWith('/')) return path
	const origin = resolveAssetOrigin()
	if (!origin) return path
	return `${origin}${path}`
}
