import type { TLShape } from '../records/TLShape'
import type { TLUser } from '../records/TLUser'
import { getTldrawMetaFromShapeMeta } from '../shapes/TLBaseShape'

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
	user: TLUser
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
	rules?: Record<string, TLPermissionRule>
}

/**
 * Returns the user ID of the shape's creator from its `meta.__tldraw` attribution metadata.
 *
 * @public
 */
export function getShapeCreatorId(shape: TLShape): string | null {
	const tlmeta = getTldrawMetaFromShapeMeta(shape.meta)
	return tlmeta.createdBy ?? null
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
