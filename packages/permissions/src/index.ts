import { registerTldrawLibraryVersion } from '@tldraw/utils'

export {
	CORE_ACTIVITIES,
	createServerPermissionsFilter,
	evaluateRule,
	getShapeCreator,
	getShapeCreatorId,
	TLPermissionsManager,
	type CoreActivityId,
	type TLAfterActionCallback,
	type TLAttributionUser,
	type TLBeforeActionCallback,
	type TLIdentityProvider,
	type TLIdentityUser,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
} from './lib/TLPermissionsManager'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
