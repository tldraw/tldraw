import { EmbedShapeUtil } from 'tldraw'

// vite inlines this NEXT_PUBLIC_ var at build time.
const googleMapsApiKey = process.env.NEXT_PUBLIC_GC_API_KEY

// Module-scoped so the array keeps a stable identity across renders.
export const embedShapeUtils = [
	EmbedShapeUtil.configure({ embedConfig: { google_maps: { apiKey: googleMapsApiKey } } }),
]
