import { react } from '@tldraw/state'
import {
	CORE_ACTIVITIES,
	evaluateRule,
	type TLAfterActionCallback,
	type TLBeforeActionCallback,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
	type TLShape,
	type TLUser,
} from '@tldraw/tlschema'
import type { Editor } from '../../Editor'

/**
 * Evaluates declarative permission rules and lifecycle hooks to gate user activity.
 * Rules are set at construction and are immutable; dynamic logic belongs in rule
 * callbacks or `onBeforeAction` hooks.
 *
 * @public
 */
export class TLPermissionsManager {
	private readonly editor: Editor
	private readonly rules: ReadonlyMap<string, TLPermissionRule>
	private readonly beforeActionCallbacks: TLBeforeActionCallback[] = []
	private readonly afterActionCallbacks: TLAfterActionCallback[] = []
	private cleanupFns: (() => void)[] = []

	/** @internal */
	constructor(editor: Editor, config: TLPermissionsManagerConfig) {
		this.editor = editor
		this.rules = new Map(Object.entries(config.rules ?? {}))
	}

	/** @internal */
	installEnforcement() {
		const { editor } = this

		// Create: delete disallowed shapes on next microtask
		this.cleanupFns.push(
			editor.sideEffects.registerAfterCreateHandler('shape', (shape, source) => {
				if (source !== 'user') return
				const user = this.getCurrentUser()
				if (!user) return
				if (
					!this.tryPerform(CORE_ACTIVITIES.CREATE_SHAPE, {
						user,
						targetShape: shape,
						shapeType: shape.type,
					})
				) {
					Promise.resolve().then(() => {
						if (editor.getShape(shape.id)) editor.deleteShape(shape.id)
					})
				}
			})
		)

		// Update: revert disallowed changes with granular partial reversion
		this.cleanupFns.push(
			editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next, source) => {
				if (source !== 'user') return next
				const user = this.getCurrentUser()
				if (!user) return next

				const ctx = { user, targetShape: prev, prevShape: prev, nextShape: next }
				if (!this.canPerform(CORE_ACTIVITIES.UPDATE_SHAPE, ctx)) return prev

				let result = next
				if (
					(next.x !== prev.x || next.y !== prev.y) &&
					this.rules.has(CORE_ACTIVITIES.MOVE_SHAPE)
				) {
					if (!this.tryPerform(CORE_ACTIVITIES.MOVE_SHAPE, ctx)) {
						result = { ...result, x: prev.x, y: prev.y }
					}
				}
				if (next.rotation !== prev.rotation && this.rules.has(CORE_ACTIVITIES.ROTATE_SHAPE)) {
					if (!this.tryPerform(CORE_ACTIVITIES.ROTATE_SHAPE, ctx)) {
						result = { ...result, rotation: prev.rotation }
					}
				}
				if (next.props !== prev.props && this.rules.has(CORE_ACTIVITIES.EDIT_SHAPE_PROPS)) {
					if (!this.tryPerform(CORE_ACTIVITIES.EDIT_SHAPE_PROPS, ctx)) {
						result = { ...result, props: prev.props } as typeof next
					}
				}
				return result
			})
		)

		// Delete: block disallowed deletions
		this.cleanupFns.push(
			editor.sideEffects.registerBeforeDeleteHandler('shape', (shape, source) => {
				if (source !== 'user') return undefined
				const user = this.getCurrentUser()
				if (!user) return undefined
				return this.tryPerform(CORE_ACTIVITIES.DELETE_SHAPE, { user, targetShape: shape })
					? undefined
					: false
			})
		)

		// Tool: enforce via reactive effect on getCurrentToolId()
		if (this.rules.has(CORE_ACTIVITIES.USE_TOOL)) {
			let lastAllowedTool = editor.getCurrentToolId()
			this.cleanupFns.push(
				react('tl-permissions-tool-enforcement', () => {
					const toolId = editor.getCurrentToolId()
					const user = this.getCurrentUser()
					if (!user) return
					if (!this.tryPerform(CORE_ACTIVITIES.USE_TOOL, { user, toolId })) {
						editor.setCurrentTool(lastAllowedTool)
					} else {
						lastAllowedTool = toolId
					}
				})
			)
		}

		// Selection: filter out shapes the user cannot select
		this.cleanupFns.push(
			editor.sideEffects.registerBeforeChangeHandler(
				'instance_page_state',
				(prev, next, source) => {
					if (source !== 'user') return next
					if (next.selectedShapeIds === prev.selectedShapeIds) return next
					const user = this.getCurrentUser()
					if (!user) return next

					const allowedIds = next.selectedShapeIds.filter((id) => {
						const shape = editor.getShape(id)
						return shape
							? this.tryPerform(CORE_ACTIVITIES.SELECT_SHAPE, { user, targetShape: shape })
							: false
					})
					return allowedIds.length === next.selectedShapeIds.length
						? next
						: { ...next, selectedShapeIds: allowedIds }
				}
			)
		)

		// Clipboard: intercept copy/cut/paste DOM events
		if (this.rules.has(CORE_ACTIVITIES.COPY_PASTE)) {
			const container = editor.getContainer()
			const block = (e: Event) => {
				const user = this.getCurrentUser()
				if (!user) return
				if (!this.tryPerform(CORE_ACTIVITIES.COPY_PASTE, { user })) {
					e.preventDefault()
					e.stopPropagation()
				}
			}
			container.addEventListener('copy', block, true)
			container.addEventListener('cut', block, true)
			container.addEventListener('paste', block, true)
			this.cleanupFns.push(() => {
				container.removeEventListener('copy', block, true)
				container.removeEventListener('cut', block, true)
				container.removeEventListener('paste', block, true)
			})
		}

		// Undo/redo: intercept keyboard shortcuts
		if (this.rules.has(CORE_ACTIVITIES.UNDO_REDO)) {
			const container = editor.getContainer()
			const block = (e: KeyboardEvent) => {
				const isUndo = (e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey
				const isRedo = (e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')
				if (!isUndo && !isRedo) return
				const user = this.getCurrentUser()
				if (!user) return
				if (!this.tryPerform(CORE_ACTIVITIES.UNDO_REDO, { user })) {
					e.preventDefault()
					e.stopPropagation()
				}
			}
			container.addEventListener('keydown', block, true)
			this.cleanupFns.push(() => container.removeEventListener('keydown', block, true))
		}
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
		return evaluateRule(this.rules, activityId, fullContext)
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
		const allowed = evaluateRule(this.rules, activityId, fullContext, this.beforeActionCallbacks)

		this.notifyAfterAction(fullContext, allowed)
		return allowed
	}

	private notifyAfterAction(context: TLPermissionContext, allowed: boolean): void {
		for (const cb of this.afterActionCallbacks) {
			cb(context, allowed)
		}
	}

	/** @public */
	canCreateShape(shapeType: string): boolean {
		return this.canPerform(CORE_ACTIVITIES.CREATE_SHAPE, { shapeType })
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
		this.cleanupFns.forEach((fn) => fn())
		this.cleanupFns = []
		this.beforeActionCallbacks.length = 0
		this.afterActionCallbacks.length = 0
	}
}

export { evaluateRule } from '@tldraw/tlschema'
