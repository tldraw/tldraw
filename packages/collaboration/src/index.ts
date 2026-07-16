import { registerTldrawLibraryVersion } from '@tldraw/utils'

// The collaboration umbrella. For now it re-exports the commenting package; over time it
// will re-export the other collaboration packages as well.

// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/commenting'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
