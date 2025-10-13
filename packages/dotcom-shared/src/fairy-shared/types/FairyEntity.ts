import { VecModel } from '@tldraw/tlschema'
import { FairyPose } from './FairyPose'

export interface FairyEntity {
	position: VecModel
	flipX: boolean
	isSelected: boolean
	pose: FairyPose
}
