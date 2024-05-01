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
	abstract getDefaultProps(): Partial<Binding['props']>

	// self lifecycle hooks
	onBeforeCreate?(binding: Binding): Binding | void
	onAfterCreate?(binding: Binding): void
	onBeforeChange?(prev: Binding, next: Binding): Binding | void
	onAfterChange?(prev: Binding, next: Binding): void
	onBeforeDelete?(binding: Binding): void
	onAfterDelete?(binding: Binding): void

	// related shape lifecycle hooks
	onAfterCreateFromShape?(binding: Binding, shape: TLShape): void
	onAfterCreateToShape?(binding: Binding, shape: TLShape): void
	// onAfterDuplicateFromShape?(
	// 	binding: Binding,
	// 	originalShape: TLShape,
	// 	newShape: TLShape,
	// 	duplicatedIds: ReadonlyMap<TLShapeId, TLShapeId>
	// ): void
	// onAfterDuplicateToShape?(
	// 	binding: Binding,
	// 	originalShape: TLShape,
	// 	newShape: TLShape,
	// 	duplicatedIds: ReadonlyMap<TLShapeId, TLShapeId>
	// ): void

	onDuplicateFromWithoutTo?(
		binding: Binding,
		originalShape: TLShape,
		duplicatedShape: TLShape
	): TLShape
	onDuplicateToWithoutFrom?(
		binding: Binding,
		originalShape: TLShape,
		duplicatedShape: TLShape
	): TLShape

	onAfterChangeFromShape?(binding: Binding, shapeBefore: TLShape, shapeAfter: TLShape): void
	onAfterChangeToShape?(binding: Binding, shapeBefore: TLShape, shapeAfter: TLShape): void
	onAfterChangeToShapeAncestry?(binding: Binding): void
	onAfterChangeFromShapeAncestry?(binding: Binding): void

	onBeforeDeleteFromShape?(binding: Binding, shape: TLShape): void
	onBeforeDeleteToShape?(binding: Binding, shape: TLShape): void
	onAfterDeleteFromShape?(binding: Binding, shape: TLShape): void
	onAfterDeleteToShape?(binding: Binding, shape: TLShape): void
}
