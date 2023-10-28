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
export const lineShapeVersions = {
	AddSnapHandles: 1,
} as const

/** @internal */
export const lineShapeMigrations = defineMigrations({
	currentVersion: lineShapeVersions.AddSnapHandles,
	migrators: {
		[lineShapeVersions.AddSnapHandles]: {
			up: (record: any) => {
				const handles = deepCopy(record.props.handles as Record<string, any>)
				for (const id in handles) {
					handles[id].canSnap = true
				}
				return { ...record, props: { ...record.props, handles } }
			},
			down: (record: any) => {
				const handles = deepCopy(record.props.handles as Record<string, any>)
				for (const id in handles) {
					delete handles[id].canSnap
				}
				return { ...record, props: { ...record.props, handles } }
			},
		},
	},
})
