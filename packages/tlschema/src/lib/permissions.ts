import type { TLShape } from '../records/TLShape'

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
export interface TLPermissionUser {
	id: string
	role?: string
}

/** @public */
export interface TLPermissionContext {
	user: TLPermissionUser
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
