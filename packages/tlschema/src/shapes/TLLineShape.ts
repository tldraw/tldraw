import { IndexKey, getIndices, objectMapFromEntries, sortByIndex } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { StyleProp } from '../styles/StyleProp'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle, TLDefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

/**
 * Style property for line shape spline interpolation. Determines how the line is rendered
 * between points - either as straight line segments or smooth cubic curves.
 *
 * @public
 * @example
 * ```ts
 * // Create a shape with cubic spline interpolation
 * const lineProps = {
 *   spline: 'cubic' as TLLineShapeSplineStyle,
 *   // other props...
 * }
 * ```
 */
export const LineShapeSplineStyle = StyleProp.defineEnum('tldraw:spline', {
	defaultValue: 'line',
	values: ['cubic', 'line'],
})

/**
 * Type representing the spline style options for line shapes.
 * - 'line': Straight line segments between points
 * - 'cubic': Smooth cubic bezier curves between points
 *
 * @public
 */
export type TLLineShapeSplineStyle = T.TypeOf<typeof LineShapeSplineStyle>

/**
 * Represents a single point in a line shape. Line shapes are made up of multiple points
 * that define the path of the line, with each point having coordinates and ordering information.
 *
 * @public
 * @example
 * ```ts
 * const linePoint: TLLineShapePoint = {
 *   id: 'a1',
 *   index: 'a1' as IndexKey,
 *   x: 100,
 *   y: 50
 * }
 * ```
 */
export interface TLLineShapePoint {
	/** Unique identifier for this point, used for tracking and ordering */
	id: string
	/** Fractional index key used for ordering points along the line */
	index: IndexKey
	/** X coordinate of the point relative to the line shape's origin */
	x: number
	/** Y coordinate of the point relative to the line shape's origin */
	y: number
}

const lineShapePointValidator: T.ObjectValidator<TLLineShapePoint> = T.object({
	id: T.string,
	index: T.indexKey,
	x: T.number,
	y: T.number,
})

/**
 * Properties for a line shape. Line shapes represent multi-point lines or splines
 * that can be drawn by connecting multiple points with either straight segments or curves.
 *
 * @public
 * @example
 * ```ts
 * const lineProps: TLLineShapeProps = {
 *   color: 'black',
 *   dash: 'solid',
 *   size: 'm',
 *   spline: 'line',
 *   points: {
 *     'a1': { id: 'a1', index: 'a1', x: 0, y: 0 },
 *     'a2': { id: 'a2', index: 'a2', x: 100, y: 50 }
 *   },
 *   scale: 1
 * }
 * ```
 */
export interface TLLineShapeProps {
	/** Color style of the line stroke */
	color: TLDefaultColorStyle
	/** Dash pattern style for the line (solid, dashed, dotted) */
	dash: TLDefaultDashStyle
	/** Size/thickness style of the line stroke */
	size: TLDefaultSizeStyle
	/** Interpolation style between points (straight lines or curved splines) */
	spline: TLLineShapeSplineStyle
	/** Dictionary of points that make up the line, keyed by point ID */
	points: Record<string, TLLineShapePoint>
	/** Scale factor applied to the line shape for display */
	scale: number
}

/**
 * A line shape that represents a multi-point line or spline on the canvas. Line shapes
 * allow users to draw connected paths with multiple points, supporting both straight
 * line segments and smooth curved splines.
 *
 * @public
 * @example
 * ```ts
 * const lineShape: TLLineShape = {
 *   id: 'shape:line1',
 *   type: 'line',
 *   x: 100,
 *   y: 100,
 *   rotation: 0,
 *   index: 'a1',
 *   parentId: 'page:main',
 *   isLocked: false,
 *   opacity: 1,
 *   props: {
 *     color: 'red',
 *     dash: 'dashed',
 *     size: 'l',
 *     spline: 'cubic',
 *     points: {
 *       'start': { id: 'start', index: 'a1', x: 0, y: 0 },
 *       'end': { id: 'end', index: 'a2', x: 200, y: 100 }
 *     },
 *     scale: 1
 *   },
 *   meta: {},
 *   typeName: 'shape'
 * }
 * ```
 */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/**
 * Validation schema for line shape properties. Defines the runtime validation rules
 * for all properties of line shapes, ensuring data integrity and type safety.
 *
 * @public
 * @example
 * ```ts
 * import { lineShapeProps } from '@tldraw/tlschema'
 *
 * // Used internally by the validation system
 * const validator = T.object(lineShapeProps)
 * const validatedProps = validator.validate(someLineProps)
 * ```
 */
export const lineShapeProps: RecordProps<TLLineShape> = {
	color: DefaultColorStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	spline: LineShapeSplineStyle,
	points: T.dict(T.string, lineShapePointValidator),
	scale: T.nonZeroNumber,
}

/**
 * Version identifiers for line shape migrations. These version numbers track
 * significant schema changes over time, enabling proper data migration between versions.
 *
 * @public
 */
export const lineShapeVersions = createShapePropsMigrationIds('line', {
	AddSnapHandles: 1,
	RemoveExtraHandleProps: 2,
	HandlesToPoints: 3,
	PointIndexIds: 4,
	AddScale: 5,
})

/**
 * Migration sequence for line shapes. Handles schema evolution over time by defining
 * how to upgrade and downgrade line shape data between different versions. Includes
 * major structural changes like the transition from handles to points and the addition
 * of scaling support.
 *
 * @public
 */
export const lineShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: lineShapeVersions.AddSnapHandles,
			up: (props) => {
				for (const handle of Object.values(props.handles)) {
					;(handle as any).canSnap = true
				}
			},
			down: 'retired',
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
		{
			id: lineShapeVersions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		},
	],
})
