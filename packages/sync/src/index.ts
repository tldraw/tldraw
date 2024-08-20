import { registerTldrawLibraryVersion } from '@tldraw/utils'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/sync-core'

export {
	useSync,
	type RemoteTLStoreWithStatus,
	type TLSyncUserInfo,
	type UseSyncOptions,
} from './useSync'
export { useSyncDemo, type UseSyncDemoOptions } from './useSyncDemo'

registerTldrawLibraryVersion(
	process.env.TLDRAW_LIBRARY_VERSION_NAME,
	process.env.TLDRAW_LIBRARY_VERSION_VERSION,
	process.env.TLDRAW_LIBRARY_VERSION_MODULES
)
