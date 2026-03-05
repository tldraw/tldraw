import { NetworkDiff, RecordOpType, applyObjectDiff } from '@tldraw/sync'
import type { UnknownRecord } from 'tldraw'
import { Editor, TLShape, react } from 'tldraw'

// ─── Identity types ─────────────────────────────────────────────────────────
// Mirrors PR #8147's TLIdentity system. Replace with imports once that lands.

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

// ─── Attribution helpers ────────────────────────────────────────────────────

/** Extract the creator identity from a shape's meta. */
export function getShapeCreator(shape: TLShape): TLAttributionUser | null {
	const meta = shape.meta as Record<string, unknown>
	return (meta?.createdBy as TLAttributionUser | undefined) ?? null
}

/** Extract the creator's user ID from a shape's meta. */
export function getShapeCreatorId(shape: TLShape): string | null {
	return getShapeCreator(shape)?.id ?? null
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
	RESIZE_SHAPE: 'resize.shape',
	ROTATE_SHAPE: 'rotate.shape',
	USE_TOOL: 'tool.use',
	COPY_PASTE: 'edit.copy_paste',
	UNDO_REDO: 'edit.undo_redo',
} as const

/** @public */
export type CoreActivityId = (typeof CORE_ACTIVITIES)[keyof typeof CORE_ACTIVITIES]

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Editor → Manager lookup ────────────────────────────────────────────────

const managersMap = new WeakMap<Editor, TLPermissionsManager>()

/** @public */
export function getPermissionsManager(editor: Editor): TLPermissionsManager | null {
	return managersMap.get(editor) ?? null
}

// ─── TLPermissionsManager ───────────────────────────────────────────────────

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

	constructor(editor: Editor, config: TLPermissionsManagerConfig) {
		this.editor = editor
		this.identity = config.identity
		this.rules = new Map(Object.entries(config.rules ?? {}))

		managersMap.set(editor, this)
		this.installEnforcement()
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

	canPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean {
		const user = context?.user ?? this.getCurrentUser()
		if (!user) return false

		const fullContext: TLPermissionContext = { user, activityId, ...context }

		const rule = this.rules.get(activityId)
		const allowed =
			rule !== undefined ? (typeof rule === 'function' ? rule(fullContext) : rule) : true

		if (!allowed) {
			this.notifyAfterAction(fullContext, false)
			return false
		}

		for (const cb of this.beforeActionCallbacks) {
			if (!cb(fullContext)) {
				this.notifyAfterAction(fullContext, false)
				return false
			}
		}

		this.notifyAfterAction(fullContext, true)
		return true
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
	canResizeShape(shape: TLShape): boolean {
		return this.canPerform(CORE_ACTIVITIES.RESIZE_SHAPE, { targetShape: shape })
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

	// ─── Enforcement ──────────────────────────────────────────────────

	private installEnforcement() {
		const { editor } = this

		// Create: delete disallowed shapes on next microtask
		this.cleanupFns.push(
			editor.sideEffects.registerAfterCreateHandler('shape', (shape, source) => {
				if (source !== 'user') return
				const user = this.getCurrentUser()
				if (!user) return
				if (
					!this.canPerform(CORE_ACTIVITIES.CREATE_SHAPE, {
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

				// Granular checks — only run if a rule is registered
				let result = next
				if (
					(next.x !== prev.x || next.y !== prev.y) &&
					this.rules.has(CORE_ACTIVITIES.MOVE_SHAPE)
				) {
					if (!this.canPerform(CORE_ACTIVITIES.MOVE_SHAPE, ctx)) {
						result = { ...result, x: prev.x, y: prev.y }
					}
				}
				if (next.rotation !== prev.rotation && this.rules.has(CORE_ACTIVITIES.ROTATE_SHAPE)) {
					if (!this.canPerform(CORE_ACTIVITIES.ROTATE_SHAPE, ctx)) {
						result = { ...result, rotation: prev.rotation }
					}
				}
				if (next.props !== prev.props && this.rules.has(CORE_ACTIVITIES.RESIZE_SHAPE)) {
					if (!this.canPerform(CORE_ACTIVITIES.RESIZE_SHAPE, ctx)) {
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
				return this.canPerform(CORE_ACTIVITIES.DELETE_SHAPE, { user, targetShape: shape })
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
					if (!this.canPerform(CORE_ACTIVITIES.USE_TOOL, { user, toolId })) {
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
							? this.canPerform(CORE_ACTIVITIES.SELECT_SHAPE, { user, targetShape: shape })
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
				if (!this.canPerform(CORE_ACTIVITIES.COPY_PASTE, { user })) {
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
				if (!this.canPerform(CORE_ACTIVITIES.UNDO_REDO, { user })) {
					e.preventDefault()
					e.stopPropagation()
				}
			}
			container.addEventListener('keydown', block, true)
			this.cleanupFns.push(() => container.removeEventListener('keydown', block, true))
		}
	}

	cleanup() {
		this.cleanupFns.forEach((fn) => fn())
		this.cleanupFns = []
		managersMap.delete(this.editor)
	}
}

// ─── Server-side permissions filter ─────────────────────────────────────────

/**
 * Creates a `filterPush` callback for `TLSocketRoom` from the same declarative
 * rules used client-side. Non-shape records pass through unchanged.
 *
 * @public
 */
export function createServerPermissionsFilter<
	SessionMeta extends { userId: string; userName?: string },
	R extends UnknownRecord = UnknownRecord,
>(
	rules: Record<string, TLPermissionRule>,
	beforeActionCallbacks?: TLBeforeActionCallback[]
): (args: {
	sessionId: string
	meta: SessionMeta
	diff: NetworkDiff<R>
	getRecord(id: string): R | undefined
}) => NetworkDiff<R> {
	const evaluate = (activityId: string, context: TLPermissionContext): boolean => {
		const rule = rules[activityId]
		const allowed = rule !== undefined ? (typeof rule === 'function' ? rule(context) : rule) : true
		if (!allowed) return false

		if (beforeActionCallbacks) {
			for (const cb of beforeActionCallbacks) {
				if (!cb(context)) return false
			}
		}
		return true
	}

	return ({ meta, diff, getRecord }) => {
		const user: TLIdentityUser = { id: meta.userId, name: meta.userName ?? meta.userId }
		const filtered: NetworkDiff<R> = {}

		for (const [id, op] of Object.entries(diff) as [string, (typeof diff)[string]][]) {
			if (!id.startsWith('shape:')) {
				filtered[id] = op
				continue
			}

			switch (op[0]) {
				case RecordOpType.Put: {
					const record = op[1] as unknown as TLShape
					if (
						evaluate(CORE_ACTIVITIES.CREATE_SHAPE, {
							user,
							activityId: CORE_ACTIVITIES.CREATE_SHAPE,
							targetShape: record,
							shapeType: record.type,
						})
					) {
						filtered[id] = op
					}
					break
				}
				case RecordOpType.Patch: {
					const prev = getRecord(id) as unknown as TLShape | undefined
					if (prev) {
						const next = applyObjectDiff(prev, op[1]) as unknown as TLShape
						if (
							evaluate(CORE_ACTIVITIES.UPDATE_SHAPE, {
								user,
								activityId: CORE_ACTIVITIES.UPDATE_SHAPE,
								targetShape: prev,
								prevShape: prev,
								nextShape: next,
							})
						) {
							filtered[id] = op
						}
					}
					break
				}
				case RecordOpType.Remove: {
					const shape = getRecord(id) as unknown as TLShape | undefined
					if (
						shape &&
						evaluate(CORE_ACTIVITIES.DELETE_SHAPE, {
							user,
							activityId: CORE_ACTIVITIES.DELETE_SHAPE,
							targetShape: shape,
						})
					) {
						filtered[id] = op
					}
					break
				}
			}
		}
		return filtered
	}
}
