import { registerTldrawLibraryVersion } from '@tldraw/utils'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/sync-core'

export {
	useSync,
	type RemoteTLStoreWithStatus,
	type UseSyncConnectFn,
	type UseSyncOptions,
	type UseSyncOptionsBase,
	type UseSyncOptionsWithConnectFn,
	type UseSyncOptionsWithUri,
} from './useSync'
export { useSyncDemo, type UseSyncDemoOptions } from './useSyncDemo'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
