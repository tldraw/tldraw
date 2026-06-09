import { Atom, Computed, atom, computed } from '@tldraw/state'
import { TLShape } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'

/**
 * A single rule within an {@link Allowable}. The rule permits an action when its
 * `test` returns `true`; the `message` explains why it would otherwise deny, for
 * debugging.
 *
 * @public
 */
export interface AllowRule<Ctx> {
	/** A unique id within the allowable, used to update or remove the rule. */
	id: string
	/** Human-readable explanation of why this rule denies the action. */
	message: string
	/** Returns `true` if this rule permits the action for `ctx`. */
	test(ctx: Ctx): boolean
}

/**
 * The result of evaluating an {@link Allowable}.
 *
 * @public
 */
export interface AllowResult {
	/** Whether every rule passed. */
	ok: boolean
	/** The id and message of each rule that denied the action, in rule order. */
	failures: Array<{ ruleId: string; message: string }>
}

/**
 * A named set of rules that must *all* pass for an action to be allowed. Its
 * `Ctx` type parameter is the context the rules are evaluated against — for
 * example, the editor's per-shape allowables have a `TLShape` context, while
 * its document-level allowables have none.
 *
 * The system is reactive: `rules` live in an {@link @tldraw/state#Atom} and a
 * contextless result is memoized in a {@link @tldraw/state#Computed}, so reading
 * {@link Allowable.can} inside a reaction recomputes when the rules or any
 * signal they read changes.
 *
 * @example
 * ```ts
 * if (!editor.allow.changeShape.can(shape)) return
 *
 * editor.allow.deleteShape.setRule({
 * 	id: 'protect-template-shapes',
 * 	message: 'Template shapes cannot be deleted',
 * 	test: (shape) => !shape.meta.isTemplate,
 * })
 * ```
 *
 * @public
 */
export class Allowable<Ctx = void> {
	/** The rules that must all pass for the action to be allowed. */
	readonly rules: Atom<AllowRule<Ctx>[]>
	private readonly result: Computed<AllowResult>

	constructor(
		/** A unique id for the allowable. */
		readonly id: string,
		initialRules: AllowRule<Ctx>[] = []
	) {
		this.rules = atom(`allow:${id}:rules`, [...initialRules])
		// A contextless result is a pure function of reactive state, so it can be
		// memoized in a computed; a result that depends on `ctx` cannot be. This
		// computed is only ever read for contextless allowables.
		this.result = computed(`allow:${id}:result`, () => this.evaluate(undefined as Ctx))
	}

	/** Whether every rule passes for `ctx`. */
	can(...args: [Ctx] extends [void] ? [] : [ctx: Ctx]): boolean {
		return this.check(...args).ok
	}

	/**
	 * Evaluate every rule for `ctx`, collecting the id and message of each rule
	 * that denies the action. Reactive: reading this within a reaction tracks the
	 * rules and any signals the rules read.
	 */
	check(...args: [Ctx] extends [void] ? [] : [ctx: Ctx]): AllowResult {
		if (args.length === 0) return this.result.get()
		return this.evaluate(args[0] as Ctx)
	}

	/**
	 * Get a reactive signal of a contextless allowable's result. Read it inside a
	 * reaction (or pass it to `useValue`) to update when the rules or the signals
	 * they read change.
	 */
	getResult(this: Allowable<void>): Computed<AllowResult> {
		return this.result
	}

	/**
	 * Like {@link Allowable.can} for a contextless allowable, but without
	 * capturing the result in the surrounding reactive context. Used by hot
	 * paths (like `setCamera` and input dispatch) that deliberately avoid
	 * becoming reactive to permission changes.
	 *
	 * @internal
	 */
	_canWithoutCapture(this: Allowable<void>): boolean {
		return this.result.__unsafe__getWithoutCapture().ok
	}

	/** Add a rule, or replace an existing rule that shares its id. */
	setRule(rule: AllowRule<Ctx>): void {
		this.rules.update((rules) => {
			const index = rules.findIndex((r) => r.id === rule.id)
			if (index === -1) return [...rules, rule]
			const next = rules.slice()
			next[index] = rule
			return next
		})
	}

	/** Remove a rule by its id. */
	removeRule(ruleId: string): void {
		this.rules.update((rules) => rules.filter((r) => r.id !== ruleId))
	}

	private evaluate(ctx: Ctx): AllowResult {
		const failures: AllowResult['failures'] = []
		for (const rule of this.rules.get()) {
			if (!rule.test(ctx)) failures.push({ ruleId: rule.id, message: rule.message })
		}
		return { ok: failures.length === 0, failures }
	}
}

/**
 * Manages the editor's allowables: named sets of rules that gate whether the
 * user can perform an action. Editor methods consult these to decide whether to
 * proceed, and consumers can add, replace, or remove rules on each
 * {@link Allowable} to customize what is permitted.
 *
 * @public
 */
export class AllowManager {
	private readonly allowables = new Map<string, Allowable<any>>()
	private readonly builtinIds: ReadonlySet<string>

	/**
	 * Whether the document may be changed. Seeded with a rule that denies changes
	 * while the editor is in readonly mode; document-mutating editor methods bail
	 * out early when this denies. Add rules to it to apply custom permissions.
	 *
	 * @public
	 */
	readonly changeDocument: Allowable<void>

	/**
	 * Whether the camera may be moved. Seeded with a rule that denies movement
	 * while the camera is locked; camera methods bail out early when this denies,
	 * unless they were called with `{ force: true }`. Add rules to it to apply
	 * custom constraints.
	 *
	 * @public
	 */
	readonly moveCamera: Allowable<void>

	/**
	 * Whether a shape may be changed. Seeded with a rule that denies changes to a
	 * locked shape (or a shape with a locked ancestor). This covers only the lock
	 * concern; readonly is handled by {@link AllowManager.changeDocument}. Add
	 * rules to it to apply custom per-shape permissions.
	 *
	 * @public
	 */
	readonly changeShape: Allowable<TLShape>

	/**
	 * Whether a shape may be selected when selecting every shape within a parent,
	 * as in select-all. Seeded with a rule that denies a directly locked shape.
	 * Unlike {@link AllowManager.changeShape}, this does not consider locked
	 * ancestors, and it is not consulted by direct selection methods like
	 * `setSelectedShapes`. Add rules to it to apply custom per-shape permissions.
	 *
	 * @public
	 */
	readonly selectShape: Allowable<TLShape>

	/**
	 * Whether a shape may be deleted. Seeded with a rule that denies a directly
	 * locked shape. Add rules to it to apply custom per-shape permissions.
	 *
	 * @public
	 */
	readonly deleteShape: Allowable<TLShape>

	/**
	 * Whether a shape may be duplicated. Seeded with a rule that denies a directly
	 * locked shape. Add rules to it to apply custom per-shape permissions.
	 *
	 * @public
	 */
	readonly duplicateShape: Allowable<TLShape>

	/**
	 * Whether a shape may be grouped. Seeded with a rule that denies a directly
	 * locked shape. Add rules to it to apply custom per-shape permissions.
	 *
	 * @public
	 */
	readonly groupShape: Allowable<TLShape>

	/**
	 * Whether a shape may be ungrouped. Seeded with a rule that denies a directly
	 * locked shape. Add rules to it to apply custom per-shape permissions.
	 *
	 * @public
	 */
	readonly ungroupShape: Allowable<TLShape>

	constructor(private readonly editor: Editor) {
		// Rules are the reusable building blocks. Allowables are semantic — tied to
		// what the user is doing — and compose these rules, sharing them where the
		// same concern applies to more than one action.
		const notReadonly: AllowRule<void> = {
			id: 'not-readonly',
			message: 'The editor is in readonly mode',
			test: () => !this.editor.getIsReadonly(),
		}
		const cameraNotLocked: AllowRule<void> = {
			id: 'not-locked',
			message: 'The camera is locked',
			test: () => !this.editor.getCameraOptions().isLocked,
		}
		const shapeNotSelfLocked: AllowRule<TLShape> = {
			id: 'not-self-locked',
			message: 'The shape is locked',
			test: (shape) => !shape.isLocked,
		}
		const shapeNoLockedAncestor: AllowRule<TLShape> = {
			id: 'no-locked-ancestor',
			message: 'An ancestor of the shape is locked',
			test: (shape) => {
				const parent = this.editor.getShapeParent(shape)
				return !parent || !this.editor.isShapeOrAncestorLocked(parent)
			},
		}

		this.changeDocument = this.register('changeDocument', [notReadonly])
		this.moveCamera = this.register('moveCamera', [cameraNotLocked])
		this.changeShape = this.register('changeShape', [shapeNotSelfLocked, shapeNoLockedAncestor])
		// These selection-driven actions share the same self-lock concern, so they
		// compose the same rule; each is its own allowable so consumers can permit
		// or deny them independently.
		this.selectShape = this.register('selectShape', [shapeNotSelfLocked])
		this.deleteShape = this.register('deleteShape', [shapeNotSelfLocked])
		this.duplicateShape = this.register('duplicateShape', [shapeNotSelfLocked])
		this.groupShape = this.register('groupShape', [shapeNotSelfLocked])
		this.ungroupShape = this.register('ungroupShape', [shapeNotSelfLocked])

		// Editor methods assume the built-ins are always registered, so protect
		// them from unregister.
		this.builtinIds = new Set(this.allowables.keys())
	}

	/**
	 * Register an allowable: a named set of rules that must all pass. Returns the
	 * allowable; hold on to it to check it and edit its rules.
	 *
	 * Ids must be unique; registering an id that is already in use throws. To
	 * change an existing allowable's rules, use {@link Allowable.setRule} and
	 * {@link Allowable.removeRule} instead.
	 */
	register<Ctx = void>(id: string, rules: AllowRule<Ctx>[] = []): Allowable<Ctx> {
		if (this.allowables.has(id)) {
			throw Error(`An allowable with id '${id}' is already registered`)
		}
		const allowable = new Allowable<Ctx>(id, rules)
		this.allowables.set(id, allowable)
		return allowable
	}

	/**
	 * Remove a previously registered allowable, freeing its id. The allowable
	 * itself keeps working for anyone still holding it. The editor's built-in
	 * allowables cannot be unregistered, as editor methods rely on them; remove
	 * or replace their rules instead.
	 */
	unregister(allowable: Allowable<any>): void {
		if (this.builtinIds.has(allowable.id)) {
			throw Error(
				`Cannot unregister the built-in allowable '${allowable.id}'. Remove or replace its rules instead.`
			)
		}
		this.allowables.delete(allowable.id)
	}
}
