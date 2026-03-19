import { registerTldrawLibraryVersion } from '@tldraw/utils'

export {
	CORE_ACTIVITIES,
	createServerPermissionsFilter,
	evaluateRule,
	getShapeCreatorId,
	type CoreActivityId,
	type TLAfterActionCallback,
	type TLBeforeActionCallback,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
} from './lib/TLPermissionsManager'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
