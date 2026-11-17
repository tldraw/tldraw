import { registerTldrawLibraryVersion } from '@tldraw/utils'

export {
	createPermissions,
	createPermissionStore,
	type CreatePermissionsOptions,
	type TLPermissionCheck,
	type TLPermissionSource,
	type TLPermissionStore,
	type TLPermissionsResult,
} from './permissions'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
