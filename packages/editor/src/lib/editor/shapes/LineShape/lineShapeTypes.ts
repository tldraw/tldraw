import {
	TLBaseShape,
	TLColorType,
	TLDashType,
	TLHandle,
	TLSizeType,
	TLSplineType,
} from '@tldraw/tlschema'

/** @public */
export type TLLineShapeProps = {
	color: TLColorType
	dash: TLDashType
	size: TLSizeType
	spline: TLSplineType
	handles: {
		[key: string]: TLHandle
	}
}

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>
