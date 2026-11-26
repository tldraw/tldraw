import type { TLShape } from '@tldraw/tlschema'
import type { ReactElement, ReactNode } from 'react'
import { defineSlot } from '../../plugins/plugin'
import type { SvgExportContext } from '../types/SvgExportContext'
import type { ShapeUtil } from './ShapeUtil'

/**
 * How the React layer draws one shape type. A view keeps a shape util free of React: the util has
 * the shape's logic, and the view renders it on the canvas and in SVG exports.
 *
 * The util's render methods call the view, and the renderers still call the util. So a subclass
 * that overrides a render method, or calls `super`, keeps working.
 *
 * @example
 * ```ts
 * class CardShapeUtil extends ShapeUtil<CardShape> {
 *   component(shape: CardShape) {
 *     return this.getView()?.component(shape, this) ?? null
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLShapeView<S extends TLShape = TLShape, U extends ShapeUtil<S> = ShapeUtil<S>> {
	readonly type: S['type']
	component(shape: S, util: U): ReactNode
	backgroundComponent?(shape: S, util: U): ReactNode
	toSvg?(
		shape: S,
		ctx: SvgExportContext,
		util: U
	): ReactElement | null | Promise<ReactElement | null>
	toBackgroundSvg?(
		shape: S,
		ctx: SvgExportContext,
		util: U
	): ReactElement | null | Promise<ReactElement | null>
}

/**
 * The shape views. One view per shape type: two plugins that contribute a view for the same type
 * throw.
 *
 * @public
 */
export const shapeViewSlot = defineSlot<TLShapeView<any, any>>('shapeViews')
