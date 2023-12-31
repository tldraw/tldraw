/* eslint-disable @typescript-eslint/no-unused-vars */
import { Migrations } from '@tldraw/store'
import { BindingProps, TLShape, TLUnknownBinding } from '@tldraw/tlschema'
import type { Editor } from '../Editor'

/** @public */
export interface TLBindingUtilConstructor<
	T extends TLUnknownBinding,
	U extends BindingUtil<T> = BindingUtil<T>
> {
	new (editor: Editor): U
	type: T['type']
	props?: BindingProps<T>
	migrations?: Migrations
}

/** @public */
export type TLBindingUtilFlag<T> = (Binding: T) => boolean

/** @public */
export interface TLBindingUtilCanvasSvgDef {
	key: string
	component: React.ComponentType
}

/** @public */
export abstract class BindingUtil<Binding extends TLUnknownBinding = TLUnknownBinding> {
	constructor(public editor: Editor) {}
	static props?: BindingProps<TLUnknownBinding>
	static migrations?: Migrations

	/**
	 * The type of the Binding util, which should match the Binding's type.
	 *
	 * @public
	 */
	static type: string

	onAfterChange?(
		binding: Binding,
		direction: 'from' | 'to',
		prev: TLShape,
		to: TLShape | null
	): void
	onBeforeShapeDelete?(binding: Binding, direction: 'from' | 'to', shape: TLShape): void
}
