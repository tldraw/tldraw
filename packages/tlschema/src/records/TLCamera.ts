import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'

import { literal, model, number, object, TypeValidator } from '@tldraw/validate'
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
export const cameraValidator: TypeValidator<TLCamera> = model(
	'camera',
	object({
		typeName: literal('camera'),
		id: idValidator<TLCameraId>('camera'),
		x: number,
		y: number,
		z: number,
	})
)

/** @internal */
export const cameraMigrations = defineMigrations({})

/** @public */
export const CameraRecordType = createRecordType<TLCamera>('camera', {
	validator: cameraValidator,
	migrations: cameraMigrations,
	scope: 'session',
}).withDefaultProperties(
	(): Omit<TLCamera, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		z: 1,
	})
)
