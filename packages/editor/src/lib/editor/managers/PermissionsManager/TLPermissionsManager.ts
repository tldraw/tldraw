import {
	CORE_ACTIVITIES,
	createPermissionGate,
	type TLAfterActionCallback,
	type TLBeforeActionCallback,
	type TLPermissionGate,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
	type TLShape,
	type TLUser,
} from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import type { TLPermissionsController } from './permissions-adapter'

/**
 * Evaluates declarative permission rules and lifecycle hooks to gate user activity.
 * Rules are set at construction and are immutable; dynamic logic belongs in rule
 * callbacks or `onBeforeAction` hooks.
 *
 * @public
 */
export class TLPermissionsManager implements TLPermissionsController {
	private readonly editor: Editor
	private readonly rules: ReadonlyMap<string, TLPermissionRule>
	private readonly beforeActionCallbacks: TLBeforeActionCallback[] = []
	private readonly afterActionCallbacks: TLAfterActionCallback[] = []
	private readonly gate: TLPermissionGate

	/** @internal */
	constructor(editor: Editor, config: TLPermissionsManagerConfig) {
		this.editor = editor
		this.rules = new Map(Object.entries(config.rules ?? {}))
		this.gate = createPermissionGate({
			rules: this.rules,
			beforeActionCallbacks: this.beforeActionCallbacks,
			afterActionCallbacks: this.afterActionCallbacks,
		})
	}

	/**
	 * Registers a callback that runs only when an action is actually attempted (via
	 * `tryPerform`) and can veto it. Returns a cleanup function.
	 *
	 * For permission state that should also affect `canPerform` (UI queries), encode
	 * the logic in a rule callback instead — rules run in both methods.
	 *
	 * @public
	 */
	onBeforeAction(callback: TLBeforeActionCallback): () => void {
		this.beforeActionCallbacks.push(callback)
		return () => {
			const idx = this.beforeActionCallbacks.indexOf(callback)
			if (idx !== -1) this.beforeActionCallbacks.splice(idx, 1)
		}
	}

	/**
	 * Registers a callback that fires after every action attempt (via `tryPerform`).
	 * Use this for notification side-effects such as showing a toast on denial.
	 * Fires once per shape, not once per gesture — if a user moves five shapes at once,
	 * this fires five times. Debounce with `requestAnimationFrame` if you need
	 * gesture-level notifications.
	 * Returns a cleanup function.
	 *
	 * @public
	 */
	onAfterAction(callback: TLAfterActionCallback): () => void {
		this.afterActionCallbacks.push(callback)
		return () => {
			const idx = this.afterActionCallbacks.indexOf(callback)
			if (idx !== -1) this.afterActionCallbacks.splice(idx, 1)
		}
	}

	/**
	 * Returns whether the current user can perform the given activity.
	 * No callbacks fire — safe for use in render paths and UI gating.
	 *
	 * @public
	 */
	canPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean {
		const user = context?.user ?? this.getCurrentUser()
		if (!user) {
			console.warn(
				'tldraw: store.props.users.getCurrentUser() returned null — all permissions denied.'
			)
			return false
		}

		const fullContext: TLPermissionContext = { user, ...context, activityId }
		return this.gate.canPerform(activityId, fullContext)
	}

	/**
	 * Returns whether the current user can perform the given activity, firing
	 * `onBeforeAction` and `onAfterAction` callbacks. Use this when an action
	 * is actually being attempted.
	 *
	 * @public
	 */
	tryPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean {
		const user = context?.user ?? this.getCurrentUser()
		if (!user) {
			console.warn(
				'tldraw: store.props.users.getCurrentUser() returned null — all permissions denied.'
			)
			return false
		}

		const fullContext: TLPermissionContext = { user, ...context, activityId }
		return this.gate.tryPerform(activityId, fullContext)
	}

	/** @public */
	canCreateShape(shapeType: string): boolean {
		return this.canPerform(CORE_ACTIVITIES.CREATE_SHAPE, { shapeType })
	}
	/** @public */
	hasRule(activityId: string): boolean {
		return this.rules.has(activityId)
	}
	/** @public */
	canUpdateShape(prev: TLShape, next: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.UPDATE_SHAPE, {
			targetShape: prev,
			prevShape: prev,
			nextShape: next,
		})
	}
	/** @public */
	canDeleteShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.DELETE_SHAPE, { targetShape: shape })
	}
	/** @public */
	canSelectShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.SELECT_SHAPE, { targetShape: shape })
	}
	/** @public */
	canViewShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.VIEW_SHAPE, { targetShape: shape })
	}
	/** @public */
	canMoveShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.MOVE_SHAPE, { targetShape: shape })
	}
	/** @public */
	canEditShapeProps(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.EDIT_SHAPE_PROPS, { targetShape: shape })
	}
	/** @public */
	canRotateShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.ROTATE_SHAPE, { targetShape: shape })
	}
	/** @public */
	canUseTool(toolId: string): boolean {
		return this.canPerform(CORE_ACTIVITIES.USE_TOOL, { toolId })
	}
	/** @public */
	canCopyPaste(): boolean {
		return this.canPerform(CORE_ACTIVITIES.COPY_PASTE)
	}
	/** @public */
	canUndoRedo(): boolean {
		return this.canPerform(CORE_ACTIVITIES.UNDO_REDO)
	}

	/** @public */
	getCurrentUser(): TLUser | null {
		return this.editor.store.props.users.getCurrentUser()
	}

	/** @public */
	cleanup() {
		this.beforeActionCallbacks.length = 0
		this.afterActionCallbacks.length = 0
	}
}

export { evaluateRule } from '@tldraw/tlschema'
