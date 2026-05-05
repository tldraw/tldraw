export function assetUrl(path: string): string {
	if (!path.startsWith('/')) return path
	const prefix = process.env.ASSET_PREFIX?.trim()
	if (!prefix) return path
	return `${prefix.replace(/\/$/, '')}${path}`
}
