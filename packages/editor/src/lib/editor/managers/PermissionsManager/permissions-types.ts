import type { TLShape } from '@tldraw/tlschema'

// ─── Identity types ─────────────────────────────────────────────────────────

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

// ─── Core activities ────────────────────────────────────────────────────────

/**
 * Well-known activity IDs for the permissions system.
 *
 * `VIEW_SHAPE` controls per-user shape visibility. Wire it into
 * `TldrawEditorBaseProps.getShapeVisibility` so hidden shapes are excluded
 * from the rendering pipeline entirely — see the Pictionary example.
 *
 * @public
 */
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

// ─── Permission types ───────────────────────────────────────────────────────

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
	identity: TLIdentityProvider
	rules?: Record<string, TLPermissionRule>
}
