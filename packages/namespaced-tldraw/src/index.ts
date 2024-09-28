import { registerTldrawLibraryVersion } from 'tldraw'
// eslint-disable-next-line local/no-export-star
export * from 'tldraw'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
