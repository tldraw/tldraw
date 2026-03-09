// Canonical definitions live in @tldraw/tlschema so they can be imported by
// server-side code without pulling in the browser-only @tldraw/editor package.
// This file re-exports them to preserve internal editor import paths.
export {
	CORE_ACTIVITIES,
	type CoreActivityId,
	type TLAfterActionCallback,
	type TLAttributionUser,
	type TLBeforeActionCallback,
	type TLIdentityProvider,
	type TLIdentityUser,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
} from '@tldraw/tlschema'
