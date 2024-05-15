import { RecordProps, TLPropsMigrations, TLShape, TLUnknownBinding } from '@tldraw/tlschema'
import { Editor } from '../Editor'

/** @public */
export interface TLBindingUtilConstructor<
	T extends TLUnknownBinding,
	U extends BindingUtil<T> = BindingUtil<T>,
> {
	new (editor: Editor): U
	type: T['type']
	props?: RecordProps<T>
	migrations?: TLPropsMigrations
}

/** @public */
export interface BindingOnCreateOptions<Binding extends TLUnknownBinding> {
	binding: Binding
}

/** @public */
export enum BindingUnbindReason {
	DeletingFromShape = 'deleting_from_shape',
	DeletingToShape = 'deleting_to_shape',
	DeletingBinding = 'deleting_binding',
}

/** @public */
export interface BindingOnUnbindOptions<Binding extends TLUnknownBinding> {
	binding: Binding
	reason: BindingUnbindReason
}

/** @public */
export interface BindingOnChangeOptions<Binding extends TLUnknownBinding> {
	bindingBefore: Binding
	bindingAfter: Binding
}

/** @public */
export interface BindingOnShapeChangeOptions<Binding extends TLUnknownBinding> {
	binding: Binding
	shapeBefore: TLShape
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

	onOperationComplete?(): void

	onBeforeUnbind?(options: BindingOnUnbindOptions<Binding>): void
	onAfterUnbind?(options: BindingOnUnbindOptions<Binding>): void

	// self lifecycle hooks
	onBeforeCreate?(options: BindingOnCreateOptions<Binding>): Binding | void
	onAfterCreate?(options: BindingOnCreateOptions<Binding>): void
	onBeforeChange?(options: BindingOnChangeOptions<Binding>): Binding | void
	onAfterChange?(options: BindingOnChangeOptions<Binding>): void

	onAfterChangeFromShape?(options: BindingOnShapeChangeOptions<Binding>): void
	onAfterChangeToShape?(options: BindingOnShapeChangeOptions<Binding>): void
}
