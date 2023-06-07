import { TLBaseShape, TLColorType, TLDashType, TLIconType, TLSizeType } from '@tldraw/tlschema'

/** @public */
export type TLIconShapeProps = {
	size: TLSizeType
	icon: TLIconType
	dash: TLDashType
	color: TLColorType
	scale: number
}

/** @public */
export type TLIconShape = TLBaseShape<'icon', TLIconShapeProps>
