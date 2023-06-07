import { TLBaseShape, TLColorType, TLDrawShapeSegment, TLSizeType } from '@tldraw/tlschema'

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
