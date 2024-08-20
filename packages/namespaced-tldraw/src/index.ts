import { registerTldrawLibraryVersion } from 'tldraw'
// eslint-disable-next-line local/no-export-star
export * from 'tldraw'

registerTldrawLibraryVersion(
	process.env.TLDRAW_LIBRARY_VERSION_NAME,
	process.env.TLDRAW_LIBRARY_VERSION_VERSION,
	process.env.TLDRAW_LIBRARY_VERSION_MODULES
)
