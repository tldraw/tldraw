import { TLBaseShape, TLColorType, TLSizeType } from '@tldraw/tlschema'
import { TLDrawShapeSegment } from '../DrawShape/drawShapeTypes'

/** @public */
export type TLHighlightShapeProps = {
	color: TLColorType
	size: TLSizeType
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isPen: boolean
}

/** @public */
export type TLHighlightShape = TLBaseShape<'highlight', TLHighlightShapeProps>
