import { Migrator } from '@tldraw/tlstore'
import { TLColorType, TLDashType, TLOpacityType, TLSizeType, TLSplineType } from '../style-types'
import { TLHandle } from '../ui-types'
import { TLBaseShape } from './shape-validation'

/** @public */
export type TLLineShapeProps = {
	color: TLColorType
	dash: TLDashType
	size: TLSizeType
	opacity: TLOpacityType
	spline: TLSplineType
	handles: {
		[key: string]: TLHandle
	}
}

/** @public */
export type TLLineShape = TLBaseShape<'line', TLLineShapeProps>

/** @public */
export const lineShapeTypeMigrator = new Migrator({})
