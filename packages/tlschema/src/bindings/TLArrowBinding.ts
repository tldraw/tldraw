import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { BindingPropsType, TLBaseBinding } from '../TLBaseBinding'
import { vec2dModelValidator } from '../misc/geometry-types'

/** @public */
export const arrowBindingProps = {
	terminal: T.literalEnum('start', 'end'),
	normalizedAnchor: vec2dModelValidator,
	// exact is whether the arrow head 'enters' the bound shape
	// to point directly at the binding anchor point
	isExact: T.boolean,
	// precise is whether to bind to the normalizedAnchor, or to the middle of the shape
	isPrecise: T.boolean,
}

/** @public */
export type TLArrowBindingProps = BindingPropsType<typeof arrowBindingProps>

/** @public */
export type TLArrowBinding = TLBaseBinding<'arrow', TLArrowBindingProps>

/** @internal */
export const arrowBindingMigrations = defineMigrations({})
