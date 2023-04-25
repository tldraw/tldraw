import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { idValidator } from '../validation'

/**
 * TLCamera
 *
 * @public
 */
export interface TLCamera extends BaseRecord<'camera'> {
	x: number
	y: number
	z: number
}

/** @public */
export type TLCameraId = ID<TLCamera>

// --- VALIDATION ---
/** @public */
export const cameraTypeValidator: T.Validator<TLCamera> = T.model(
	'camera',
	T.object({
		typeName: T.literal('camera'),
		id: idValidator<TLCameraId>('camera'),
		x: T.number,
		y: T.number,
		z: T.number,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const cameraTypeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	// STEP 3: Add an up+down migration for the new version here
	migrators: {},
})

/** @public */
export const TLCamera = createRecordType<TLCamera>('camera', {
	migrations: cameraTypeMigrations,
	validator: cameraTypeValidator,
}).withDefaultProperties(
	(): Omit<TLCamera, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		z: 1,
	})
)
