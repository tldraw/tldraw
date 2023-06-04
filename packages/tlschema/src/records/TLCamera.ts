import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * A camera record.
 *
 * @public
 */
export interface TLCamera extends BaseRecord<'camera', TLCameraId> {
	x: number
	y: number
	z: number
}

/**
 * The id of a camera record.
 *
 * @public */
export type TLCameraId = RecordId<TLCamera>

/** @internal */
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

/** @internal */
export const cameraMigrations = defineMigrations({})

/** @public */
export const CameraRecordType = createRecordType<TLCamera>('camera', {
	validator: cameraValidator,
	migrations: cameraMigrations,
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLCamera, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		z: 1,
	})
)
