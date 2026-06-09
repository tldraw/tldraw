import { Atom, Computed, atom, computed } from '@tldraw/state'
import { TLShape } from '@tldraw/tlschema'
import { assertExists } from '@tldraw/utils'
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
 * A named set of rules that must *all* pass for an action to be allowed. The
 * object returned from {@link AllowManager.register} carries its `Ctx` type, so
 * passing it to {@link AllowManager.can} type-checks the context argument.
 *
 * Its `rules` are held in an {@link @tldraw/state#Atom}, so editing them (and any
 * signals their `test`s read) makes {@link AllowManager.can} reactive.
 *
 * @public
 */
export interface Allowable<Ctx> {
	id: string
	rules: Atom<AllowRule<Ctx>[]>
}

/**
 * The result of evaluating an {@link Allowable}.
 *
 * @public
 */
export interface AllowResult {
	/** Whether every rule passed. */
	ok: boolean
	/** The messages of any rules that denied the action, in rule order. */
	reasons: string[]
}

/**
 * Manages the editor's allow rules: named sets of rules that gate whether the
 * user can perform an action. Editor methods consult these to decide whether to
 * proceed, and consumers can add, replace, or remove rules to customize what is
 * permitted.
 *
 * The system is reactive: rules live in signals and contextless results are
 * memoized in {@link @tldraw/state#Computed}s, so reading {@link AllowManager.can}
 * inside a reaction recomputes when the rules or any signal they read changes.
 *
 * @public
 */
export class AllowManager {
	private readonly allowables = new Map<string, Allowable<any>>()
	private readonly results = new Map<string, Computed<AllowResult>>()

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
	 * Whether a shape may be selected (and acted on by selection-driven commands
	 * like delete, group, and ungroup). Seeded with a rule that denies a directly
	 * locked shape. Unlike {@link AllowManager.changeShape}, this does not consider
	 * locked ancestors. Add rules to it to apply custom per-shape permissions.
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
	}

	/**
	 * Register an allowable: a named set of rules that must all pass. Returns the
	 * allowable so it can be passed to {@link AllowManager.can} and the rule-editing
	 * methods, where its `Ctx` type checks their arguments.
	 */
	register<Ctx = void>(id: string, rules: AllowRule<Ctx>[] = []): Allowable<Ctx> {
		this.results.delete(id)
		const allowable: Allowable<Ctx> = { id, rules: atom(`allow:${id}:rules`, [...rules]) }
		this.allowables.set(id, allowable)
		return allowable
	}

	/** Remove a previously registered allowable. */
	unregister(allowable: Allowable<any>): void {
		this.allowables.delete(allowable.id)
		this.results.delete(allowable.id)
	}

	/** Add a rule, or replace an existing rule that shares its id. */
	setRule<Ctx>(allowable: Allowable<Ctx>, rule: AllowRule<Ctx>): void {
		const target = this.getRegistered(allowable)
		target.rules.update((rules) => {
			const index = rules.findIndex((r) => r.id === rule.id)
			if (index === -1) return [...rules, rule]
			const next = rules.slice()
			next[index] = rule
			return next
		})
	}

	/** Remove a rule from an allowable by its id. */
	removeRule(allowable: Allowable<any>, ruleId: string): void {
		const target = this.getRegistered(allowable)
		target.rules.update((rules) => rules.filter((r) => r.id !== ruleId))
	}

	/**
	 * Get a reactive signal of a contextless allowable's result. Read it inside a
	 * reaction (or with `useValue`) to update when its rules or the signals they
	 * read change.
	 */
	getResult(allowable: Allowable<void>): Computed<AllowResult> {
		return this.getResultComputed(this.getRegistered(allowable))
	}

	/**
	 * Evaluate every rule of the allowable for `ctx`, collecting the messages of
	 * all rules that deny the action. Reactive: reading this within a reaction
	 * tracks the allowable's rules and any signals the rules read.
	 */
	check<Ctx>(
		allowable: Allowable<Ctx>,
		...args: [Ctx] extends [void] ? [] : [ctx: Ctx]
	): AllowResult {
		const target = this.getRegistered(allowable)
		// A contextless result is a pure function of reactive state, so we can
		// memoize it in a computed; a result that depends on `ctx` cannot be.
		if (args.length === 0) return this.getResultComputed(target).get()
		return this.evaluate(target, args[0] as Ctx)
	}

	/** Whether every rule of the allowable passes for `ctx`. */
	can<Ctx>(allowable: Allowable<Ctx>, ...args: [Ctx] extends [void] ? [] : [ctx: Ctx]): boolean {
		return this.check(allowable, ...args).ok
	}

	/** Clean up any resources held by the manager. */
	dispose() {
		// Nothing to tear down: the manager holds no subscriptions or timers, and
		// its maps are released when the editor is garbage collected. We keep the
		// registered allowables intact so `can()` still works on a disposed editor,
		// matching the rest of the editor's post-dispose behavior.
	}

	private evaluate<Ctx>(allowable: Allowable<Ctx>, ctx: Ctx): AllowResult {
		const reasons: string[] = []
		for (const rule of allowable.rules.get()) {
			if (!rule.test(ctx)) reasons.push(rule.message)
		}
		return { ok: reasons.length === 0, reasons }
	}

	private getResultComputed<Ctx>(allowable: Allowable<Ctx>): Computed<AllowResult> {
		let result = this.results.get(allowable.id)
		if (!result) {
			result = computed(`allow:${allowable.id}:result`, () =>
				this.evaluate(allowable, undefined as Ctx)
			)
			this.results.set(allowable.id, result)
		}
		return result
	}

	private getRegistered<Ctx>(allowable: Allowable<Ctx>): Allowable<Ctx> {
		return assertExists(
			this.allowables.get(allowable.id),
			`No allowable registered with id '${allowable.id}'`
		)
	}
}
