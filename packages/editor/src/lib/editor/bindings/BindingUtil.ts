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
	abstract getDefaultProps(): Binding['props']

	onAfterShapeChange?(
		binding: Binding,
		direction: 'from' | 'to',
		prev: TLShape,
		next: TLShape
	): void

	onBeforeShapeDelete?(binding: Binding, direction: 'from' | 'to', shape: TLShape): void
}
