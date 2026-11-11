import { registerTldrawLibraryVersion } from '@tldraw/utils'

// The collaboration umbrella: re-exports the collaboration feature packages.

// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/commenting'
// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/permissions'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
