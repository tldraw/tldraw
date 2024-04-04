import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { Editor } from '../Editor'

export interface TLBinding<Type extends string> {
	readonly type: Type
	readonly fromId: TLShapeId
	readonly toId: TLShapeId
}

export type TLUnknownBinding = TLBinding<string>

/** @public */
export interface TLBindingUtilConstructor<
	T extends TLBinding<string>,
	U extends BindingUtil<T> = BindingUtil<T>,
> {
	new (editor: Editor): U
	type: T['type']
}

export type TLAnyBindingUtilConstructor = TLBindingUtilConstructor<TLBinding<string>>

/** @public */
export abstract class BindingUtil<Binding extends TLBinding<string>> {
	constructor(public editor: Editor) {}

	static type: string

	abstract getBindingsFromShape(shape: TLShape): Binding[] | null | undefined

	onAfterCreateFromShape?(binding: Binding, shape: TLShape): void
	onAfterCreateToShape?(binding: Binding, shape: TLShape): void

	onAfterChangeFromShape?(binding: Binding, shapeBefore: TLShape, shapeAfter: TLShape): void
	onAfterChangeToShape?(binding: Binding, shapeBefore: TLShape, shapeAfter: TLShape): void

	onAfterChangeToShapeAncestry?(binding: Binding): void
	onAfterChangeFromShapeAncestry?(binding: Binding): void

	onBeforeDeleteFromShape?(binding: Binding, shape: TLShape): void
	onBeforeDeleteToShape?(binding: Binding, shape: TLShape): void
	onAfterDeleteFromShape?(binding: Binding, shape: TLShape): void
	onAfterDeleteToShape?(binding: Binding, shape: TLShape): void
}
