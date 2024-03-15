import { defineMigrations } from '@tldraw/store'
import { IndexKey, deepCopy, getIndices, objectMapFromEntries, sortByIndex } from '@tldraw/utils'
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

const lineShapePointValidator = T.object({
	id: T.string,
	index: T.indexKey,
	x: T.number,
	y: T.number,
})

/** @public */
export const lineShapeProps = {
	color: DefaultColorStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	spline: LineShapeSplineStyle,
	points: T.dict(T.string, lineShapePointValidator),
}

/** @public */
export type TLLineShapeProps = ShapePropsType<typeof lineShapeProps>

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/** @internal */
export const lineShapeVersions = {
	AddSnapHandles: 1,
	RemoveExtraHandleProps: 2,
	HandlesToPoints: 3,
	PointIndexIds: 4,
} as const

/** @internal */
export const lineShapeMigrations = defineMigrations({
	currentVersion: lineShapeVersions.PointIndexIds,
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
		[lineShapeVersions.HandlesToPoints]: {
			up: (record: any) => {
				const { handles, ...props } = record.props

				const sortedHandles = (Object.entries(handles) as [IndexKey, { x: number; y: number }][])
					.map(([index, { x, y }]) => ({ x, y, index }))
					.sort(sortByIndex)

				return {
					...record,
					props: {
						...props,
						points: sortedHandles.map(({ x, y }) => ({ x, y })),
					},
				}
			},
			down: (record: any) => {
				const { points, ...props } = record.props
				const indices = getIndices(points.length)

				return {
					...record,
					props: {
						...props,
						handles: Object.fromEntries(
							points.map((handle: { x: number; y: number }, i: number) => {
								const index = indices[i]
								return [
									index,
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
		[lineShapeVersions.PointIndexIds]: {
			up: (record: any) => {
				const { points, ...props } = record.props
				const indices = getIndices(points.length)

				return {
					...record,
					props: {
						...props,
						points: Object.fromEntries(
							points.map((point: { x: number; y: number }, i: number) => {
								const id = indices[i]
								return [
									id,
									{
										id: id,
										index: id,
										x: point.x,
										y: point.y,
									},
								]
							})
						),
					},
				}
			},
			down: (record: any) => {
				const sortedHandles = (
					Object.values(record.props.points) as { x: number; y: number; index: IndexKey }[]
				).sort(sortByIndex)

				return {
					...record,
					props: {
						...record.props,
						points: sortedHandles.map(({ x, y }) => ({ x, y })),
					},
				}
			},
		},
	},
})
