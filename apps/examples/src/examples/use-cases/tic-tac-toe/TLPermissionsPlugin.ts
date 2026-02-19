import { Editor, TLShape, react } from 'tldraw'

/**
 * [PERMISSIONS SPIKE] TLPermissionRules
 *
 * Defines what a user can and cannot do within the editor.
 * Rules are callback-based rather than declarative, enabling dynamic permissions
 * (e.g. "student can see shapes only after teacher unlocks them").
 *
 * In a production SDK these rules would be evaluated in two places:
 *   1. Server-side in the sync worker — rejecting illegal record mutations before
 *      they are committed to the authoritative store.
 *   2. Client-side via React context/hooks — adapting the UI to hide or disable
 *      actions the user is not permitted to take (defensive UX, not sole enforcement).
 */
export interface TLPermissionRules {
	/** Return true if the user may create a shape of this type. */
	canCreateShape(userId: string, shapeType: string): boolean

	/**
	 * Return true if the user may apply the proposed update.
	 * `prev` is the current shape state; `next` is what is being proposed.
	 * Returning `prev` from the store handler reverts the change.
	 */
	canUpdateShape(userId: string, prev: TLShape, next: TLShape): boolean

	/** Return true if the user may delete this shape. */
	canDeleteShape(userId: string, shape: TLShape): boolean

	/** Return true if the user may select this shape. */
	canSelectShape(userId: string, shape: TLShape): boolean

	/**
	 * Return true if the user may activate this tool (including via keyboard shortcut).
	 * When omitted, all tools are permitted.
	 * When a disallowed tool is activated, the plugin immediately switches back to the
	 * last tool the user was permitted to use.
	 */
	canUseTool?(userId: string, toolId: string): boolean
}

export interface TLPermissionsConfig {
	userId: string
	rules: TLPermissionRules
}

/**
 * [PERMISSIONS SPIKE] TLPermissionsPlugin
 *
 * Demonstrates how per-user shape-level permissions could be integrated into
 * the tldraw SDK. The plugin installs store side-effects that act as an
 * enforcement layer analogous to server-side validation in a sync architecture.
 *
 * ─── Key design decisions (from the team discussion) ──────────────────────────
 *
 * 1. TWO LAYERS OF ENFORCEMENT
 *    • Data layer (store side-effects): acts like the "server" — reverting or
 *      blocking illegal record mutations. In production this logic would run
 *      inside the sync worker, which means the client cannot circumvent it.
 *    • UI layer (React context / hooks): adapts the editor UI to hide or
 *      disable actions the user cannot take. This is defensive UX; the data
 *      layer is the authoritative guard.
 *
 * 2. SOURCE AWARENESS
 *    • All handlers receive `source: 'user' | 'remote'`.
 *    • Only 'user' mutations are permission-checked. Changes that arrive
 *      from the sync server ('remote') are already validated and pass through.
 *
 * 3. CALLBACK-BASED RULES
 *    • Rules are functions, not static config files, so they can be dynamic
 *      (e.g. "teacher can see all; student can only see unlocked shapes").
 *    • Third-party shape types can be registered alongside built-in ones.
 *
 * 4. KNOWN LIMITATION OF THIS SPIKE
 *    • CREATE prevention: `registerBeforeCreateHandler` can modify a record
 *      but cannot currently cancel creation outright (it must return `R`).
 *      The workaround here is to delete the forbidden shape in `afterCreate`,
 *      which causes a one-frame flash.
 *    • A production SDK would add a `null | false` return path to the
 *      beforeCreate API so creation can be rejected before it hits the store.
 *
 * 6. TOOL ENFORCEMENT
 *    • `canUseTool` is enforced via a `react()` effect that monitors the reactive
 *      `editor.getCurrentToolId()` computed signal. When a disallowed tool is
 *      activated (e.g. via keyboard shortcut) the effect fires synchronously and
 *      switches back to the last tool the user was permitted to use.
 *
 * 5. SELECTION ENFORCEMENT
 *    • Selection is stored in `instance_page_state.selectedShapeIds` (one per page).
 *    • We intercept `beforeChange` on `instance_page_state` and filter out shape
 *      IDs the user is not permitted to select before the change is committed.
 */
export class TLPermissionsPlugin {
	private userId: string
	private rules: TLPermissionRules
	private editor: Editor
	private cleanupFns: (() => void)[] = []

	constructor(editor: Editor, config: TLPermissionsConfig) {
		this.editor = editor
		this.userId = config.userId
		this.rules = config.rules
		this.setup()
	}

	private setup() {
		const { editor, userId, rules } = this

		// ─── LAYER 1: DATA-LEVEL ENFORCEMENT ──────────────────────────────────
		// These mirror what a sync server would do: validate that the proposed
		// record state is legal for this user, and revert/reject if not.

		// Auto-tag every shape the user creates with their userId as owner.
		this.cleanupFns.push(
			editor.sideEffects.registerBeforeCreateHandler('shape', (shape, source) => {
				if (source !== 'user') return shape
				return { ...shape, meta: { ...shape.meta, owner: userId } }
			})
		)

		// Reject creation of disallowed shape types.
		// SPIKE NOTE: We cannot cancel creation in beforeCreate (see limitation 4
		// above), so we immediately delete the shape in afterCreate instead.
		this.cleanupFns.push(
			editor.sideEffects.registerAfterCreateHandler('shape', (shape, source) => {
				if (source !== 'user') return
				if (!rules.canCreateShape(userId, shape.type)) {
					// Use a microtask so the store transaction is fully complete first.
					Promise.resolve().then(() => {
						if (editor.getShape(shape.id)) {
							editor.deleteShape(shape.id)
						}
					})
				}
			})
		)

		// Reject illegal updates by reverting to the previous state.
		// Returning `prev` from a beforeChange handler is the idiomatic way to
		// block a change without throwing.
		this.cleanupFns.push(
			editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next, source) => {
				if (source !== 'user') return next
				if (!rules.canUpdateShape(userId, prev, next)) {
					return prev
				}
				return next
			})
		)

		// Reject illegal deletions by returning false.
		this.cleanupFns.push(
			editor.sideEffects.registerBeforeDeleteHandler('shape', (shape, source) => {
				if (source !== 'user') return undefined
				return rules.canDeleteShape(userId, shape) ? undefined : false
			})
		)

		// ─── TOOL ENFORCEMENT ─────────────────────────────────────────────────
		// `getCurrentToolId()` is a @computed reactive signal, so `react()` fires
		// whenever the active tool changes — including via keyboard shortcut.
		// When a disallowed tool is activated we immediately switch back to the
		// last tool the user was permitted to use.
		if (rules.canUseTool) {
			let lastAllowedTool = editor.getCurrentToolId()
			this.cleanupFns.push(
				react('tl-permissions-tool-enforcement', () => {
					const toolId = editor.getCurrentToolId()
					if (!rules.canUseTool!(userId, toolId)) {
						editor.setCurrentTool(lastAllowedTool)
					} else {
						lastAllowedTool = toolId
					}
				})
			)
		}

		// ─── LAYER 2: UI-LEVEL ENFORCEMENT ────────────────────────────────────
		// Filter the current selection to remove shapes this user cannot select.
		// Selection state lives on `instance_page_state`, not `instance`.
		// This prevents the user from accidentally (or intentionally) interacting
		// with another player's pieces or the board.
		this.cleanupFns.push(
			editor.sideEffects.registerBeforeChangeHandler('instance_page_state', (prev, next, source) => {
				if (source !== 'user') return next

				const nextIds = next.selectedShapeIds
				const prevIds = prev.selectedShapeIds
				if (nextIds === prevIds) return next

				const allowedIds = nextIds.filter((shapeId) => {
					const shape = editor.getShape(shapeId)
					if (!shape) return false
					return rules.canSelectShape(userId, shape)
				})

				if (allowedIds.length === nextIds.length) return next
				return { ...next, selectedShapeIds: allowedIds }
			})
		)
	}

	// ─── HELPERS FOR UI LAYER ───────────────────────────────────────────────
	// These methods expose permission checks to React components so they can
	// conditionally render or disable UI elements.

	/** Check if this user can create a shape of the given type (for UI use). */
	canCreateShape(shapeType: string): boolean {
		return this.rules.canCreateShape(this.userId, shapeType)
	}

	/** Check if this user can delete this shape (for UI use). */
	canDeleteShape(shape: TLShape): boolean {
		return this.rules.canDeleteShape(this.userId, shape)
	}

	/** Check if this user can select this shape (for UI use). */
	canSelectShape(shape: TLShape): boolean {
		return this.rules.canSelectShape(this.userId, shape)
	}

	/** Remove all handlers registered by this plugin. */
	cleanup() {
		this.cleanupFns.forEach((fn) => fn())
		this.cleanupFns = []
	}
}
