import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

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
export const cameraValidator: T.Validator<TLCamera> = T.model(
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
export const CameraRecordType = createRecordType<TLCamera>('camera', {
	validator: cameraValidator,
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLCamera, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		z: 1,
	})
)

/** @public */
export const cameraTypeMigrations = defineMigrations({})
