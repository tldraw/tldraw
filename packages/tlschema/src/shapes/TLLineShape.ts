import { T } from '@tldraw/validate'
import { handleValidator } from '../misc/TLHandle'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const LineShapeSplineStyle = StyleProp.defineEnum('tldraw:spline', {
	// 💡❗ If you remove a value from this enum, make sure you also add a migration.
	// 💡❗ (see the tlschema README.md for instructions)
	defaultValue: 'line',
	values: ['cubic', 'line'],
})

/** @public */
export type TLLineShapeSplineStyle = T.TypeOf<typeof LineShapeSplineStyle>

/** @public */
export const lineShapeProps = {
	// 💡❗ If you make any changes to this type, make sure you also add a migration if required.
	// 💡❗ (see the tlschema README.md for instructions)
	color: DefaultColorStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	spline: LineShapeSplineStyle,
	handles: T.dict(T.string, handleValidator),
}

/** @public */
export type TLLineShapeProps = ShapePropsType<typeof lineShapeProps>

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>
