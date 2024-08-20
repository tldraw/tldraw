import { registerTldrawLibraryVersion } from '@tldraw/utils'
export { track } from './lib/track'
export { useAtom } from './lib/useAtom'
export { useComputed } from './lib/useComputed'
export { useQuickReactor } from './lib/useQuickReactor'
export { useReactor } from './lib/useReactor'
export { useStateTracking } from './lib/useStateTracking'
export { useValue } from './lib/useValue'

registerTldrawLibraryVersion(
	process.env.TLDRAW_LIBRARY_VERSION_NAME,
	process.env.TLDRAW_LIBRARY_VERSION_VERSION,
	process.env.TLDRAW_LIBRARY_VERSION_MODULES
)
