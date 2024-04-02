import { IndexKey, getIndices, objectMapFromEntries, sortByIndex } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RETIRED_DOWN_MIGRATION, RecordPropsType } from '../recordsWithProps'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

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
export type TLLineShapeProps = RecordPropsType<typeof lineShapeProps>

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/** @public */
export const lineShapeVersions = createShapePropsMigrationIds('line', {
	AddSnapHandles: 1,
	RemoveExtraHandleProps: 2,
	HandlesToPoints: 3,
	PointIndexIds: 4,
})

/** @public */
export const lineShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: lineShapeVersions.AddSnapHandles,
			up: (props) => {
				for (const handle of Object.values(props.handles)) {
					;(handle as any).canSnap = true
				}
			},
			down: RETIRED_DOWN_MIGRATION,
		},
		{
			id: lineShapeVersions.RemoveExtraHandleProps,
			up: (props) => {
				props.handles = objectMapFromEntries(
					Object.values(props.handles).map((handle: any) => [
						handle.index,
						{
							x: handle.x,
							y: handle.y,
						},
					])
				)
			},
			down: (props) => {
				const handles = Object.entries(props.handles)
					.map(([index, handle]: any) => ({ index, ...handle }))
					.sort(sortByIndex)
				props.handles = Object.fromEntries(
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
				)
			},
		},
		{
			id: lineShapeVersions.HandlesToPoints,
			up: (props) => {
				const sortedHandles = (
					Object.entries(props.handles) as [IndexKey, { x: number; y: number }][]
				)
					.map(([index, { x, y }]) => ({ x, y, index }))
					.sort(sortByIndex)

				props.points = sortedHandles.map(({ x, y }) => ({ x, y }))
				delete props.handles
			},
			down: (props) => {
				const indices = getIndices(props.points.length)

				props.handles = Object.fromEntries(
					props.points.map((handle: { x: number; y: number }, i: number) => {
						const index = indices[i]
						return [
							index,
							{
								x: handle.x,
								y: handle.y,
							},
						]
					})
				)

				delete props.points
			},
		},
		{
			id: lineShapeVersions.PointIndexIds,
			up: (props) => {
				const indices = getIndices(props.points.length)

				props.points = Object.fromEntries(
					props.points.map((point: { x: number; y: number }, i: number) => {
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
				)
			},
			down: (props) => {
				const sortedHandles = (
					Object.values(props.points) as { x: number; y: number; index: IndexKey }[]
				).sort(sortByIndex)

				props.points = sortedHandles.map(({ x, y }) => ({ x, y }))
			},
		},
	],
})
