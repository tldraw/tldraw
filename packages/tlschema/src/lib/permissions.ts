import type { TLShape } from '../records/TLShape'

// TODO(#8147): TLIdentityUser, TLIdentityProvider, and TLAttributionUser are
// defined here as a temporary home. Once PR #8147 lands they will be moved to
// TLIdentity.ts and these local definitions should be removed in favour of
// importing from there.

/** @public */
export interface TLIdentityUser {
	readonly id: string
	readonly name: string
	readonly color?: string
}

/** @public */
export interface TLIdentityProvider {
	getCurrentUser(): TLIdentityUser | null
	resolveUser(userId: string): TLIdentityUser | null
}

/** @public */
export interface TLAttributionUser {
	readonly id: string
	readonly name: string
}

/** @public */
export const CORE_ACTIVITIES = {
	CREATE_SHAPE: 'create.shape',
	UPDATE_SHAPE: 'update.shape',
	DELETE_SHAPE: 'delete.shape',
	SELECT_SHAPE: 'select.shape',
	VIEW_SHAPE: 'view.shape',
	MOVE_SHAPE: 'move.shape',
	EDIT_SHAPE_PROPS: 'edit.shape_props',
	ROTATE_SHAPE: 'rotate.shape',
	USE_TOOL: 'tool.use',
	COPY_PASTE: 'edit.copy_paste',
	UNDO_REDO: 'edit.undo_redo',
} as const

/** @public */
export type CoreActivityId = (typeof CORE_ACTIVITIES)[keyof typeof CORE_ACTIVITIES]

/** @public */
export interface TLPermissionContext {
	user: TLIdentityUser
	activityId: string
	targetShape?: TLShape
	prevShape?: TLShape
	nextShape?: TLShape
	toolId?: string
	shapeType?: string
}

/** @public */
export type TLPermissionRule = boolean | ((context: TLPermissionContext) => boolean)

/** @public */
export type TLBeforeActionCallback = (context: TLPermissionContext) => boolean

/** @public */
export type TLAfterActionCallback = (context: TLPermissionContext, allowed: boolean) => void

/** @public */
export interface TLPermissionsManagerConfig {
	// TODO(#8147): Once PR #8147 lands, the editor will expose a first-class `identity` option.
	// At that point `TLPermissionsManagerConfig.identity` should be removed and the permissions
	// manager should read the identity from `editor.getIdentity()` instead.
	identity: TLIdentityProvider
	rules?: Record<string, TLPermissionRule>
}

// TODO(#8147): getShapeCreator and getShapeCreatorId are temporary shims. Once PR #8147 lands,
// shapes will carry a first-class `tlmeta.createdBy` field and these helpers should be removed.

/** @public */
export function getShapeCreator(shape: TLShape): TLAttributionUser | null {
	const meta = shape.meta as Record<string, unknown>
	return (meta?.createdBy as TLAttributionUser | undefined) ?? null
}

/** @public */
export function getShapeCreatorId(shape: TLShape): string | null {
	return getShapeCreator(shape)?.id ?? null
}

/** @public */
export function evaluateRule(
	rules: Record<string, TLPermissionRule> | ReadonlyMap<string, TLPermissionRule>,
	activityId: string,
	context: TLPermissionContext,
	beforeActionCallbacks?: readonly TLBeforeActionCallback[]
): boolean {
	const rule =
		rules instanceof Map
			? rules.get(activityId)
			: (rules as Record<string, TLPermissionRule>)[activityId]
	const allowed = rule !== undefined ? (typeof rule === 'function' ? rule(context) : rule) : true
	if (!allowed) return false

	if (beforeActionCallbacks) {
		for (const cb of beforeActionCallbacks) {
			if (!cb(context)) return false
		}
	}
	return true
}
