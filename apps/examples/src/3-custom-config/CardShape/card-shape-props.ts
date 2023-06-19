import { DefaultColorStyle, ShapeProps, StyleProp } from '@tldraw/tldraw'
import { T } from '@tldraw/validate'
import { ICardShape, IWeightStyle } from './card-shape-types'

export const WeightStyle = new StyleProp<IWeightStyle>(
	'myApp:weight',
	'regular',
	T.literalEnum('regular', 'bold')
)

// Validation for our custom card shape's props, using our custom style + one of tldraw's default styles
export const cardShapeProps: ShapeProps<ICardShape> = {
	w: T.number,
	h: T.number,
	color: DefaultColorStyle,
	weight: WeightStyle,
}
