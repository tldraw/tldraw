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
export interface BindingOnChangeOptions<Binding extends TLUnknownBinding> {
	bindingBefore: Binding
	bindingAfter: Binding
}

/** @public */
export interface BindingOnDeleteOptions<Binding extends TLUnknownBinding> {
	binding: Binding
}

/** @public */
export interface BindingOnShapeChangeOptions<Binding extends TLUnknownBinding> {
	binding: Binding
	shapeBefore: TLShape
	shapeAfter: TLShape
}

/** @public */
export interface BindingOnShapeDeleteOptions<Binding extends TLUnknownBinding> {
	binding: Binding
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

	// self lifecycle hooks
	onBeforeCreate?(options: BindingOnCreateOptions<Binding>): Binding | void
	onAfterCreate?(options: BindingOnCreateOptions<Binding>): void
	onBeforeChange?(options: BindingOnChangeOptions<Binding>): Binding | void
	onAfterChange?(options: BindingOnChangeOptions<Binding>): void
	onBeforeDelete?(options: BindingOnDeleteOptions<Binding>): void
	onAfterDelete?(options: BindingOnDeleteOptions<Binding>): void

	onAfterChangeFromShape?(options: BindingOnShapeChangeOptions<Binding>): void
	onAfterChangeToShape?(options: BindingOnShapeChangeOptions<Binding>): void

	onBeforeDeleteFromShape?(options: BindingOnShapeDeleteOptions<Binding>): void
	onBeforeDeleteToShape?(options: BindingOnShapeDeleteOptions<Binding>): void
}
