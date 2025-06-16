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
 * Options passed to {@link BindingUtil.onBeforeDelete} and {@link BindingUtil.onAfterDelete},
 * describing a binding being deleted.
 *
 * @public
 */
export interface BindingOnDeleteOptions<Binding extends TLUnknownBinding> {
	/** The binding being deleted. */
	binding: Binding
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
	/**
	 * Why did this shape change?
	 * - 'self': the shape itself changed
	 * - 'ancestry': the ancestry of the shape changed, but the shape itself may not have done
	 */
	reason: 'self' | 'ancestry'
}

/**
 * Options passed to {@link BindingUtil.onBeforeIsolateFromShape} and
 * {@link BindingUtil.onBeforeIsolateToShape}, describing a shape that is about to be isolated from
 * the one that it's bound to.
 *
 * Isolation happens whenever two bound shapes are separated. For example
 * 1. One is deleted, but the other is not.
 * 1. One is copied, but the other is not.
 * 1. One is duplicated, but the other is not.
 *
 * In each of these cases, if the remaining shape depends on the binding for its rendering, it may
 * now be in an inconsistent state. For example, tldraw's arrow shape depends on the binding to know
 * where the end of the arrow is. If we removed the binding without doing anything else, the arrow
 * would suddenly be pointing to the wrong location. Instead, when the shape the arrow is pointing
 * to is deleted, or the arrow is copied/duplicated, we use an isolation callback. The callback
 * updates the arrow based on the binding that's about to be removed, so it doesn't end up pointing
 * to the wrong place.
 *
 * For this style of consistency update, use isolation callbacks. For actions specific to deletion
 * (like deleting a sticker when the shape it's bound to is removed), use the delete callbacks
 * ({@link BindingUtil.onBeforeDeleteFromShape} and {@link BindingUtil.onBeforeDeleteToShape})
 * instead.
 *
 * @public
 */
export interface BindingOnShapeIsolateOptions<Binding extends TLUnknownBinding> {
	/** The binding record that refers to the shape in question. */
	binding: Binding
	/**
	 * The shape being removed. For deletion, this is the deleted shape. For copy/duplicate, this is
	 * the shape that _isn't_ being copied/duplicated and is getting left behind.
	 */
	removedShape: TLShape
}

/**
 * Options passed to {@link BindingUtil.onBeforeDeleteFromShape} and
 * {@link BindingUtil.onBeforeDeleteToShape}, describing a bound shape that is about to be deleted.
 *
 * See {@link BindingOnShapeIsolateOptions} for discussion on when to use the delete vs. the isolate
 * callbacks.
 *
 * @public
 */
export interface BindingOnShapeDeleteOptions<Binding extends TLUnknownBinding> {
	/** The binding record that refers to the shape in question. */
	binding: Binding
	/** The shape that is about to be deleted. */
	shape: TLShape
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
	 * Note that this only fires when the binding record is changing, not when the shapes
	 * associated change. Use {@link BindingUtil.onAfterChangeFromShape} and
	 * {@link BindingUtil.onAfterChangeToShape} for that.
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
	 * Note that this only fires when the binding record is changing, not when the shapes
	 * associated change. Use {@link BindingUtil.onAfterChangeFromShape} and
	 * {@link BindingUtil.onAfterChangeToShape} for that.
	 *
	 * @public
	 */
	onAfterChange?(options: BindingOnChangeOptions<Binding>): void

	/**
	 * Called when a binding is about to be deleted. See {@link BindingOnDeleteOptions} for details.
	 *
	 * @public
	 */
	onBeforeDelete?(options: BindingOnDeleteOptions<Binding>): void

	/**
	 * Called after a binding has been deleted. See {@link BindingOnDeleteOptions} for details.
	 *
	 * @public
	 */
	onAfterDelete?(options: BindingOnDeleteOptions<Binding>): void

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

	/**
	 * Called before the shape referenced in a binding's `fromId` is about to be deleted. Use this
	 * with care - you may want to use {@link BindingUtil.onBeforeIsolateToShape} instead. See
	 * {@link BindingOnShapeDeleteOptions} for details.
	 *
	 * @public
	 */
	onBeforeDeleteFromShape?(options: BindingOnShapeDeleteOptions<Binding>): void
	/**
	 * Called before the shape referenced in a binding's `toId` is about to be deleted. Use this
	 * with care - you may want to use {@link BindingUtil.onBeforeIsolateFromShape} instead. See
	 * {@link BindingOnShapeDeleteOptions} for details.
	 *
	 * @public
	 */
	onBeforeDeleteToShape?(options: BindingOnShapeDeleteOptions<Binding>): void

	/**
	 * Called before the shape referenced in a binding's `fromId` is about to be isolated from the
	 * shape referenced in `toId`. See {@link BindingOnShapeIsolateOptions} for discussion on what
	 * isolation means, and when/how to use this callback.
	 */
	onBeforeIsolateFromShape?(options: BindingOnShapeIsolateOptions<Binding>): void

	/**
	 * Called before the shape referenced in a binding's `toId` is about to be isolated from the
	 * shape referenced in `fromId`. See {@link BindingOnShapeIsolateOptions} for discussion on what
	 * isolation means, and when/how to use this callback.
	 */
	onBeforeIsolateToShape?(options: BindingOnShapeIsolateOptions<Binding>): void
}
