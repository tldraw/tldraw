import { DefaultColorStyle, RecordProps, T } from 'tldraw'
import { ICardShape } from './card-shape-types'

// Validation for our custom card shape's props, using one of tldraw's default styles
export const cardShapeProps: RecordProps<ICardShape> = {
	w: T.number,
	h: T.number,
	color: DefaultColorStyle,
}

// To generate your own custom styles, check out the custom styles example.
