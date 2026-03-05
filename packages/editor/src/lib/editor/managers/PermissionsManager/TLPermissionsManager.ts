import { react } from '@tldraw/state'
import type { TLShape } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import {
	CORE_ACTIVITIES,
	type TLAfterActionCallback,
	type TLBeforeActionCallback,
	type TLIdentityProvider,
	type TLIdentityUser,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
} from './permissions-types'

/**
 * Centralized permissions manager for tldraw.
 *
 * Evaluates declarative rules and lifecycle hooks to determine whether a user
 * can perform a given activity. Installs store side-effects to enforce rules
 * at the data layer, and exposes convenience methods for UI integration.
 *
 * Rules are set once at construction and are immutable. Dynamic behavior
 * (e.g. turn-based gating) should be handled via `onBeforeAction` hooks or
 * by reading reactive atoms / mutable refs inside rule callbacks.
 *
 * @public
 */
export class TLPermissionsManager {
	private readonly identity: TLIdentityProvider
	private readonly editor: Editor
	private readonly rules: ReadonlyMap<string, TLPermissionRule>
	private readonly beforeActionCallbacks: TLBeforeActionCallback[] = []
	private readonly afterActionCallbacks: TLAfterActionCallback[] = []
	private cleanupFns: (() => void)[] = []

	/** @internal */
	constructor(editor: Editor, config: TLPermissionsManagerConfig) {
		this.editor = editor
		this.identity = config.identity
		this.rules = new Map(Object.entries(config.rules ?? {}))
	}

	/**
	 * Install enforcement side-effects. Called by the Editor after the
	 * constructor has finished initializing all managers.
	 *
	 * @internal
	 */
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
				if (!this.tryPerform(CORE_ACTIVITIES.UPDATE_SHAPE, ctx)) return prev

				// Granular checks — only run if a rule is registered
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

	// ─── Lifecycle hooks ──────────────────────────────────────────────

	onBeforeAction(callback: TLBeforeActionCallback): () => void {
		this.beforeActionCallbacks.push(callback)
		return () => {
			const idx = this.beforeActionCallbacks.indexOf(callback)
			if (idx !== -1) this.beforeActionCallbacks.splice(idx, 1)
		}
	}

	onAfterAction(callback: TLAfterActionCallback): () => void {
		this.afterActionCallbacks.push(callback)
		return () => {
			const idx = this.afterActionCallbacks.indexOf(callback)
			if (idx !== -1) this.afterActionCallbacks.splice(idx, 1)
		}
	}

	// ─── Permission evaluation ────────────────────────────────────────

	/**
	 * Pure query — evaluates whether the action is allowed without firing
	 * `onAfterAction` callbacks.
	 */
	canPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean {
		const user = context?.user ?? this.getCurrentUser()
		if (!user) return false

		const fullContext: TLPermissionContext = { user, activityId, ...context }
		return evaluateRule(this.rules, activityId, fullContext, this.beforeActionCallbacks)
	}

	/**
	 * Evaluates + fires `onAfterAction` callbacks. Use this when user code
	 * wants notifications (e.g. toast on denied action).
	 */
	tryPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean {
		const user = context?.user ?? this.getCurrentUser()
		if (!user) return false

		const fullContext: TLPermissionContext = { user, activityId, ...context }
		const allowed = evaluateRule(this.rules, activityId, fullContext, this.beforeActionCallbacks)

		this.notifyAfterAction(fullContext, allowed)
		return allowed
	}

	private notifyAfterAction(context: TLPermissionContext, allowed: boolean): void {
		for (const cb of this.afterActionCallbacks) {
			cb(context, allowed)
		}
	}

	// ─── Convenience methods ──────────────────────────────────────────

	canCreateShape(shapeType: string): boolean {
		return this.canPerform(CORE_ACTIVITIES.CREATE_SHAPE, { shapeType })
	}
	canUpdateShape(prev: TLShape, next: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.UPDATE_SHAPE, {
			targetShape: prev,
			prevShape: prev,
			nextShape: next,
		})
	}
	canDeleteShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.DELETE_SHAPE, { targetShape: shape })
	}
	canSelectShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.SELECT_SHAPE, { targetShape: shape })
	}
	canViewShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.VIEW_SHAPE, { targetShape: shape })
	}
	canMoveShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.MOVE_SHAPE, { targetShape: shape })
	}
	canEditShapeProps(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.EDIT_SHAPE_PROPS, { targetShape: shape })
	}
	canRotateShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.ROTATE_SHAPE, { targetShape: shape })
	}
	canUseTool(toolId: string): boolean {
		return this.canPerform(CORE_ACTIVITIES.USE_TOOL, { toolId })
	}
	canCopyPaste(): boolean {
		return this.canPerform(CORE_ACTIVITIES.COPY_PASTE)
	}
	canUndoRedo(): boolean {
		return this.canPerform(CORE_ACTIVITIES.UNDO_REDO)
	}

	getCurrentUser(): TLIdentityUser | null {
		return this.identity.getCurrentUser()
	}

	cleanup() {
		this.cleanupFns.forEach((fn) => fn())
		this.cleanupFns = []
		this.beforeActionCallbacks.length = 0
		this.afterActionCallbacks.length = 0
	}
}

// ─── Shared evaluation ──────────────────────────────────────────────────────

/** @internal */
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
