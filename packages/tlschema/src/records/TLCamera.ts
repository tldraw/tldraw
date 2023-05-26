import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { idValidator } from '../validation'

/**
 * TLCamera
 *
 * @public
 */
export interface TLCamera extends BaseRecord<'camera', TLCameraId> {
	x: number
	y: number
	z: number
}

/** @public */
export type TLCameraId = ID<TLCamera>

/** @public */
export const CameraRecordType = createRecordType<TLCamera>('camera', {
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLCamera, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		z: 1,
	})
)

/** @public */
export const cameraTypeValidator = T.model<TLCamera>(
	'camera',
	T.object({
		typeName: T.literal('camera'),
		id: idValidator<TLCameraId>('camera'),
		x: T.number,
		y: T.number,
		z: T.number,
	})
)

/** @public */
export const cameraTypeMigrator = new Migrator()
