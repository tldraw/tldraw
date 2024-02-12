import { defineMigrations } from '@tldraw/store'
import { deepCopy, mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
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

/** @internal */
export const lineHandleValidator = T.object({
	index: T.string,
	x: T.number,
	y: T.number,
})

/** @public */
export type TLLineShapeHandle = T.TypeOf<typeof lineHandleValidator>

/** @public */
export const lineShapeProps = {
	color: DefaultColorStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	spline: LineShapeSplineStyle,
	handles: T.dict(T.string, lineHandleValidator),
}

/** @public */
export type TLLineShapeProps = ShapePropsType<typeof lineShapeProps>

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/** @internal */
export const lineShapeVersions = {
	AddSnapHandles: 1,
	RemoveExtraHandleProps: 2,
} as const

/** @internal */
export const lineShapeMigrations = defineMigrations({
	currentVersion: lineShapeVersions.RemoveExtraHandleProps,
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
		[lineShapeVersions.RemoveExtraHandleProps]: {
			up: (record: any) => {
				return {
					...record,
					props: {
						...record.props,
						handles: mapObjectMapValues(record.props.handles, (id, handle: any) => ({
							index: handle.index,
							x: handle.x,
							y: handle.y,
						})),
					},
				}
			},
			down: (record: any) => {
				return {
					...record,
					props: {
						...record.props,
						handles: mapObjectMapValues(record.props.handles, (id, handle: any) => ({
							id,
							type: 'vertex',
							canBind: false,
							canSnap: true,
							index: handle.index,
							x: handle.x,
							y: handle.y,
						})),
					},
				}
			},
		},
	},
})
