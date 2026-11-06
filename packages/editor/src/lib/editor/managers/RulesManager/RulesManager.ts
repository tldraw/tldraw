import {
	TLRuleDecision,
	TLRuleDenial,
	TLRuleRecord,
	TLRules,
	TLRuleUser,
	TLWriteOp,
	compileRules,
} from '@tldraw/rules'
import { Atom, Computed, atom, computed, unsafe__withoutCapture } from '@tldraw/state'
import { TLAccessState, TLRecord, TLShape } from '@tldraw/tlschema'
import { isEqual } from '@tldraw/utils'
import type { Editor } from '../../Editor'
import { EditorManager } from '../EditorManager'

/**
 * The editor side of `@tldraw/rules`. In a rules room, the sync server sends the rule set and
 * this user's facts. The editor compiles the same rules and uses them three ways:
 *
 * - **Affordances.** Shapes the user may not edit act as locked. Tools whose shape type the user
 *   can never create are hidden. When no shape write is possible at all, the editor is read-only.
 *   These come from the analyzer, so they need no extra rules and no extra code per feature.
 * - **Writes.** A user write the rules deny never reaches the store (or the server). Creates get
 *   the same stamps the server will apply, so the push commits without a rebase.
 * - **Reasons.** The last denial is kept, with the rule's message and the failing clause.
 *
 * @public
 */
export class RulesManager extends EditorManager {
	private readonly localAccess: Atom<TLAccessState | null> = atom('local access', null)
	private readonly lastDenial: Atom<{ denial: TLRuleDenial; at: number } | null> = atom(
		'last rules denial',
		null
	)

	constructor(editor: Editor) {
		super(editor)
		const isGated = (record: TLRecord, source: 'user' | 'remote') =>
			source === 'user' && this.isActive() && editor.store.scopedTypes.document.has(record.typeName)

		const handlers = editor.store.sideEffects
		for (const typeName of editor.store.scopedTypes.document) {
			// one handler per synced type; the store's typing is per type, the check is not
			const t = typeName as 'shape'
			this.register(
				handlers.registerBeforeCreateHandler(t, (record: any, source) => {
					if (!isGated(record, source)) return record
					const stamped = this.getCompiled()!.stamp(record as any, this.getUser(), this.get)
					return this.check('create', null, stamped as TLRecord) ? (stamped as TLRecord) : null
				})
			)
			this.register(
				handlers.registerBeforeChangeHandler(t, (prev: any, next: any, source) => {
					// The editor re-puts records it already has (the current user's record after a
					// sync, for example). A no-op is not a write, so it must not show a denial.
					if (!isGated(next, source) || isEqual(prev, next)) return next
					return this.check('update', prev, next) ? next : prev
				})
			)
			this.register(
				handlers.registerBeforeDeleteHandler(t, (record: any, source) => {
					if (!isGated(record, source)) return
					if (!this.check('delete', record, null)) return false
					return
				})
			)
		}
	}

	// eslint-disable-next-line tldraw/prefer-class-methods -- passed to the rules as a callback
	private readonly get = (id: string) => this.editor.store.get(id as any) as any

	private readonly access: Computed<TLAccessState | null> = computed('rules access', () => {
		return this.localAccess.get() ?? this.editor.store.props.collaboration?.access?.get() ?? null
	})

	private readonly compiled: Computed<TLRules | null> = computed('compiled rules', () => {
		const access = this.access.get()
		return access ? compileRules(access.rules) : null
	})

	/**
	 * Use rules without a sync server, or override the server's. Pass `null` to go back to what
	 * the server sends.
	 */
	setAccess(access: TLAccessState | null) {
		this.localAccess.set(access)
	}

	isActive(): boolean {
		return this.compiled.get() !== null
	}

	getCompiled(): TLRules | null {
		return this.compiled.get()
	}

	getUser(): TLRuleUser {
		return this.access.get()?.user ?? {}
	}

	getAccess(): TLAccessState | null {
		return this.access.get()
	}

	/** The last write the rules stopped, with the reason. */
	getLastDenial() {
		return this.lastDenial.get()
	}

	private check(op: TLWriteOp, prev: TLRecord | null, next: TLRecord | null) {
		const rules = this.getCompiled()!
		const typeName = (next ?? prev)!.typeName
		const result = rules.checkWrite<TLRuleRecord>({
			op,
			typeName,
			prev: prev as TLRuleRecord | null,
			next: next as TLRuleRecord | null,
			user: this.getUser(),
			get: this.get,
		})
		if (!result.ok) {
			unsafe__withoutCapture(() => this.lastDenial.set({ denial: result.denial, at: Date.now() }))
		}
		return result.ok
	}

	/** May the user do a host action? True when no rules are active. */
	can(action: string): boolean {
		const rules = this.getCompiled()
		return rules ? rules.can(action, this.getUser()) : true
	}

	/**
	 * Could the user ever do this write, given what you know of the record? `'maybe'` means it
	 * depends on the rest of the record, such as where a shape is drawn.
	 */
	decide(
		op: TLWriteOp,
		typeName: string,
		known?: { prev?: Record<string, unknown>; next?: Record<string, unknown> }
	): TLRuleDecision {
		const rules = this.getCompiled()
		if (!rules) return 'allow'
		return rules.decide(op, typeName, this.getUser(), known, (id) => this.get(id))
	}

	private readonly _isReadonly = computed('rules readonly', () => {
		if (!this.isActive()) return false
		return (['create', 'update', 'delete'] as const).every(
			(op) => this.decide(op, 'shape') === 'deny'
		)
	})

	/** No write to any shape is possible for this user: the editor runs read-only. */
	getIsReadonly(): boolean {
		return this._isReadonly.get()
	}

	/** Could the user ever use this tool? Tools without a shape type are always allowed. */
	canUseTool(toolId: string): boolean {
		if (!this.isActive()) return true
		const tool = this.editor.root.children?.[toolId]
		const shapeType = tool?.shapeType
		if (!shapeType) return true
		return this.decide('create', 'shape', { next: { type: shapeType } }) !== 'deny'
	}

	private readonly editableCache = computed('rules editable shapes', () => {
		// rebuilt when the rules or the user change; each entry tracks the records it read
		const rules = this.getCompiled()
		const user = this.getUser()
		const cache = new Map<string, Computed<boolean>>()
		return (shape: TLShape) => {
			if (!rules) return true
			let c = cache.get(shape.id)
			if (!c) {
				c = computed('editable ' + shape.id, () => {
					const current = this.editor.store.get(shape.id)
					return current ? rules.canEdit(current as any, user, this.get) : true
				})
				cache.set(shape.id, c)
			}
			return c.get()
		}
	})

	/** May the user touch this shape at all? The editor treats a shape that fails this as locked. */
	canEditShape(shape: TLShape): boolean {
		if (!this.isActive()) return true
		return this.editableCache.get()(shape)
	}

	/** Why the user may not touch this shape, or null if they may. */
	explainEdit(shape: TLShape): TLRuleDenial | null {
		const rules = this.getCompiled()
		if (!rules) return null
		const result = rules.checkWrite({
			op: 'update',
			typeName: shape.typeName,
			prev: shape as any,
			next: shape as any,
			user: this.getUser(),
			get: this.get,
		})
		return result.ok ? null : result.denial
	}
}
