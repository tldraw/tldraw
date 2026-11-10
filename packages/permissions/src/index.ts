import { registerTldrawLibraryVersion } from '@tldraw/utils'

export {
	createPermissionPolicy,
	getRequiredPermission,
	hasPermission,
	judgeChange,
	TL_PERMISSIONS,
	type TLPermissionChange,
	type TLPermissionGrant,
	type TLPermissionPolicy,
} from './permissions'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
