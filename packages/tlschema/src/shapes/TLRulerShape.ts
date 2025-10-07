import { T } from '@tldraw/validate'
import { createShapePropsMigrationIds, createShapePropsMigrationSequence } from '../records/TLShape'
import { RecordProps } from '../recordsWithProps'
import { DefaultColorStyle, TLDefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle, TLDefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultSizeStyle, TLDefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLBaseShape } from './TLBaseShape'

/**
 * Properties for a ruler shape. Ruler shapes are measurement tools that display
 * the distance between two points.
 *
 * @public
 */
export interface TLRulerShapeProps {
	/** Color style of the ruler line */
	color: TLDefaultColorStyle
	/** Dash pattern style for the ruler line (solid, dashed, dotted) */
	dash: TLDefaultDashStyle
	/** Size/thickness style of the ruler line */
	size: TLDefaultSizeStyle
	/** Width of the ruler (distance between start and end X coordinates) */
	w: number
	/** Height of the ruler (distance between start and end Y coordinates) */
	h: number
	/** Scale factor applied to the ruler shape for display */
	scale: number
}

/**
 * A ruler shape that measures and displays the distance between two points on the canvas.
 *
 * @public
 */
export type TLRulerShape = TLBaseShape<'ruler', TLRulerShapeProps>

/**
 * Validation schema for ruler shape properties.
 *
 * @public
 */
export const rulerShapeProps: RecordProps<TLRulerShape> = {
	color: DefaultColorStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	w: T.number,
	h: T.number,
	scale: T.nonZeroNumber,
}

/**
 * Version identifiers for ruler shape migrations.
 *
 * @public
 */
export const rulerShapeVersions = createShapePropsMigrationIds('ruler', {
	AddScale: 1,
})

/**
 * Migration sequence for ruler shapes.
 *
 * @public
 */
export const rulerShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		{
			id: rulerShapeVersions.AddScale,
			up: (props) => {
				props.scale = 1
			},
			down: (props) => {
				delete props.scale
			},
		},
	],
})
