import { registerTldrawLibraryVersion } from '@tldraw/utils'

export { composeRules } from './compose'
export { createStructureRule, type TLStructureRuleArgs } from './structure'
export {
	getOwningAncestor,
	getOwningPage,
	type TLOwningAncestor,
	type TLOwningPage,
} from './ownership'
export {
	createPermissionPolicy,
	getRequiredPermission,
	isPermitted,
	getMissingPermission,
	isChangePermitted,
	TL_PERMISSIONS,
	type TLPermissionChange,
	type TLPermissionPolicy,
	type TLPermissionSource,
	type TLRecordTypePermissions,
} from './permissions'
export type { TLPermissionGrant } from '@tldraw/tlschema'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
