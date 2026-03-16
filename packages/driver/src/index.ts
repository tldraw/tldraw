import { registerTldrawLibraryVersion } from '@tldraw/utils'

export { Driver } from './lib/Driver'
export type { EventModifiers, PointerEventInit } from './lib/Driver'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
