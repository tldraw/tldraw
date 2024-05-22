import { RecordProps, TLPropsMigrations, TLShape, TLUnknownBinding } from '@tldraw/tlschema'
import { Editor } from '../Editor'

/** @public */
export interface TLBindingUtilConstructor<
	T extends TLUnknownBinding,
	U extends BindingUtil<T> = BindingUtil<T>,
> {
	new (editor: Editor): U
	type: T['type']
	/** Validations for this binding's props. */
	props?: RecordProps<T>
	/** Migrations for this binding's props. */
	migrations?: TLPropsMigrations
}

/**
 * Options passed to {@link BindingUtil.onBeforeCreate} and {@link BindingUtil.onAfterCreate},
 * describing a the creating a binding.
 *
 * @public
 */
export interface BindingOnCreateOptions<Binding extends TLUnknownBinding> {
	/** The binding being created. */
	binding: Binding
}

/**
 * Options passed to {@link BindingUtil.onBeforeUnbind} and {@link BindingUtil.onAfterUnbind},
 * describing a binding being unbound.
 *
 * - `delete_from_shape`: The shape referenced by the binding's `fromId` is being deleted.
 * - `delete_to_shape`: The shape referenced by the binding's `toId` is being deleted.
 * - `delete_binding`: The binding itself is being deleted, but the shapes involved are not.
 *
 * @public
 */
export interface BindingOnUnbindOptions<Binding extends TLUnknownBinding> {
	/** The binding which is being unbound. */
	binding: Binding
	/**
	 * The reason the binding it being unbound.
	 *
	 * - `delete _from_shape`: The shape referenced by the binding's `fromId` is being deleted.
	 * - `delete_to_shape`: The shape referenced by the binding's `toId` is being deleted.
	 * - `delete_binding`: The binding itself is being deleted, but the shapes involved are not.
	 */
	reason: 'delete_from_shape' | 'delete_to_shape' | 'delete_binding'
}

/**
 * Options passed to {@link BindingUtil.onBeforeChange} and {@link BindingUtil.onAfterChange},
 * describing the data associated with a binding being changed.
 *
 * @public
 */
export interface BindingOnChangeOptions<Binding extends TLUnknownBinding> {
	/** The binding record before the change is made. */
	bindingBefore: Binding
	/** The binding record after the change is made. */
	bindingAfter: Binding
}

/**
 * Options passed to {@link BindingUtil.onAfterChangeFromShape} and
 * {@link BindingUtil.onAfterChangeToShape}, describing a bound shape being changed.
 *
 * @public
 */
export interface BindingOnShapeChangeOptions<Binding extends TLUnknownBinding> {
	/** The binding record linking these two shapes. */
	binding: Binding
	/** The shape record before the change is made. */
	shapeBefore: TLShape
	/** The shape record after the change is made. */
	shapeAfter: TLShape
}

/** @public */
export abstract class BindingUtil<Binding extends TLUnknownBinding = TLUnknownBinding> {
	constructor(public editor: Editor) {}
	static props?: RecordProps<TLUnknownBinding>
	static migrations?: TLPropsMigrations

	/**
	 * The type of the binding util, which should match the binding's type.
	 *
	 * @public
	 */
	static type: string

	/**
	 * Get the default props for a binding.
	 *
	 * @public
	 */
	abstract getDefaultProps(): Partial<Binding['props']>

	/**
	 * Called whenever a store operation involving this binding type has completed. This is useful
	 * for working with networks of related bindings that may need to update together.
	 *
	 * @example
	 * ```ts
	 * class MyBindingUtil extends BindingUtil<MyBinding> {
	 *   changedBindingIds = new Set<TLBindingId>()
	 *
	 *   onOperationComplete() {
	 *     doSomethingWithChangedBindings(this.changedBindingIds)
	 *     this.changedBindingIds.clear()
	 *   }
	 *
	 *   onAfterChange({ bindingAfter }: BindingOnChangeOptions<MyBinding>) {
	 *     this.changedBindingIds.add(bindingAfter.id)
	 *   }
	 * }
	 * ```
	 *
	 * @public
	 */
	onOperationComplete?(): void

	/**
	 * Called when a binding is about to be created. See {@link BindingOnCreateOptions} for details.
	 *
	 * You can optionally return a new binding to replace the one being created - for example, to
	 * set different initial props.
	 *
	 * @public
	 */
	onBeforeCreate?(options: BindingOnCreateOptions<Binding>): Binding | void

	/**
	 * Called after a binding has been created. See {@link BindingOnCreateOptions} for details.
	 *
	 * @public
	 */
	onAfterCreate?(options: BindingOnCreateOptions<Binding>): void

	/**
	 * Called when a binding is about to be changed. See {@link BindingOnChangeOptions} for details.
	 *
	 * You can optionally return a new binding to replace the one being changed - for example, to
	 * enforce constraints on the binding's props.
	 *
	 * @public
	 */
	onBeforeChange?(options: BindingOnChangeOptions<Binding>): Binding | void

	/**
	 * Called after a binding has been changed. See {@link BindingOnChangeOptions} for details.
	 *
	 * @public
	 */
	onAfterChange?(options: BindingOnChangeOptions<Binding>): void

	/**
	 * Called before a binding is removed. See {@link BindingOnUnbindOptions} for details.
	 *
	 * Use this hook to perform any necessary cleanup when a binding is removed, such as updating a
	 * shape so that removing a binding doesn't change the shape's appearance.
	 *
	 * @public
	 */
	onBeforeUnbind?(options: BindingOnUnbindOptions<Binding>): void

	/**
	 * Called after a binding has been removed. See {@link BindingOnUnbindOptions} for details.
	 *
	 * @public
	 */
	onAfterUnbind?(options: BindingOnUnbindOptions<Binding>): void

	/**
	 * Called after the shape referenced in a binding's `fromId` is changed. Use this to propagate
	 * any changes to the binding itself or the other shape as needed. See
	 * {@link BindingOnShapeChangeOptions} for details.
	 *
	 * @public
	 */
	onAfterChangeFromShape?(options: BindingOnShapeChangeOptions<Binding>): void

	/**
	 * Called after the shape referenced in a binding's `toId` is changed. Use this to propagate any
	 * changes to the binding itself or the other shape as needed. See
	 * {@link BindingOnShapeChangeOptions} for details.
	 *
	 * @public
	 */
	onAfterChangeToShape?(options: BindingOnShapeChangeOptions<Binding>): void
}
