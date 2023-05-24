import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'

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
export const cameraTypeMigrator = new Migrator({})
