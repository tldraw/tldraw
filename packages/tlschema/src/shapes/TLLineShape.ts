import { defineMigrations } from '@tldraw/store'
import { deepCopy } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { handleValidator } from '../misc/TLHandle'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

/** @public */
export const LineShapeSplineStyle = StyleProp.defineEnum('tldraw:spline', {
	defaultValue: 'line',
	values: ['cubic', 'line'],
})

/** @public */
export type TLLineShapeSplineStyle = T.TypeOf<typeof LineShapeSplineStyle>

/** @public */
export const lineShapeProps = {
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

/** @internal */
export const LineShapeMigrations = {
	AddSnapHandles: 1,
}

/** @internal */
export const lineShapeMigrations = defineMigrations({
	currentVersion: LineShapeMigrations.AddSnapHandles,
	migrators: {
		[LineShapeMigrations.AddSnapHandles]: {
			up(record: any) {
				const handles = deepCopy(record.props.handles as Record<string, any>)
				for (const id in handles) {
					handles[id].canSnap = true
				}
				record.props.handles = handles
				return record
			},
			down(record: any) {
				const handles = deepCopy(record.props.handles as Record<string, any>)
				for (const id in handles) {
					delete handles[id].canSnap
				}
				record.props.handles = handles
				return record
			},
		},
	},
})
