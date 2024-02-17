import { defineMigrations } from '@tldraw/store'
import { deepCopy, objectMapFromEntries, objectMapValues, sortByIndex } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { ShapePropsType, TLBaseShape } from './TLBaseShape'

const handleModelValidator = T.object({
	id: T.string,
	index: T.indexKey,
	x: T.number,
	y: T.number,
})

/** @public */
export type TLLineShapeHandle = T.TypeOf<typeof handleModelValidator>

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
	handles: T.dict(T.string, handleModelValidator),
}

/** @public */
export type TLLineShapeProps = ShapePropsType<typeof lineShapeProps>

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/** @internal */
export const lineShapeVersions = {
	AddSnapHandles: 1,
	RemoveExtraHandleProps: 2,
	RestoreSomeProps: 3,
} as const

/** @internal */
export const lineShapeMigrations = defineMigrations({
	currentVersion: lineShapeVersions.RestoreSomeProps,
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
						handles: objectMapFromEntries(
							Object.values(record.props.handles).map((handle: any) => [
								handle.index,
								{
									x: handle.x,
									y: handle.y,
								},
							])
						),
					},
				}
			},
			down: (record: any) => {
				const handles = Object.entries(record.props.handles)
					.map(([index, handle]: any) => ({ index, ...handle }))
					.sort(sortByIndex)

				return {
					...record,
					props: {
						...record.props,
						handles: Object.fromEntries(
							handles.map((handle, i) => {
								const id =
									i === 0 ? 'start' : i === handles.length - 1 ? 'end' : `handle:${handle.index}`
								return [
									id,
									{
										id,
										type: 'vertex',
										canBind: false,
										canSnap: true,
										index: handle.index,
										x: handle.x,
										y: handle.y,
									},
								]
							})
						),
					},
				}
			},
		},
		[lineShapeVersions.RestoreSomeProps]: {
			up: (record: any) => {
				return {
					...record,
					props: {
						...record.props,
						handles: objectMapFromEntries(
							Object.entries(record.props.handles as Record<string, { x: number; y: number }>).map(
								([index, handle]) => {
									const id = 'handle:' + index
									return [
										id,
										{
											id,
											index: index,
											x: handle.x,
											y: handle.y,
										},
									]
								}
							)
						),
					},
				}
			},
			down: (record: any) => {
				const handles = (objectMapValues(record.props.handles) as any).sort(sortByIndex)

				return {
					...record,
					props: {
						...record.props,
						handles: Object.fromEntries(
							handles.map((handle: any) => {
								return [
									handle.index,
									{
										x: handle.x,
										y: handle.y,
									},
								]
							})
						),
					},
				}
			},
		},
	},
})
