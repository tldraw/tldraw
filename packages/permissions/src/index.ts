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
	createGrantsPolicy,
	defaultGrantsPolicy,
	getPermissionPlaces,
	getRequiredPermission,
	isPermitted,
	isChangePermitted,
	TL_PERMISSIONS,
	type TLGrantsPolicy,
	type TLGrantsPolicyOptions,
	type TLIsChangePermittedOptions,
	type TLIsPermittedOptions,
	type TLPermissionChange,
	type TLPermissionPlace,
	type TLRequiredPermissionOptions,
} from './permissions'
export type {
	TLPermissionGrant,
	TLPermissionRequirement,
	TLPermissionRequirements,
	TLRecordTypePermissions,
	TLWritePolicy,
} from '@tldraw/tlschema'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
