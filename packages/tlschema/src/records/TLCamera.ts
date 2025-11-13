import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * A camera record representing the viewport's position and zoom level.
 * The camera defines what portion of the infinite canvas is visible to the user.
 *
 * @example
 * ```ts
 * const camera: TLCamera = {
 *   id: 'camera:user1',
 *   typeName: 'camera',
 *   x: 100,    // Camera x position (negative values pan right)
 *   y: 50,     // Camera y position (negative values pan down)
 *   z: 0.5,    // Zoom level (1 = 100%, 0.5 = 50%, 2 = 200%)
 *   meta: {
 *     userId: 'user123',
 *     lastUpdated: Date.now()
 *   }
 * }
 *
 * // Set camera position and zoom
 * editor.setCamera({ x: -200, y: -100, z: 1.5 })
 * ```
 *
 * @public
 */
export interface TLCamera extends BaseRecord<'camera', TLCameraId> {
	/** Camera x position. Negative values move the viewport right */
	x: number
	/** Camera y position. Negative values move the viewport down */
	y: number
	/** Zoom level. 1 = 100%, 0.5 = 50% zoom, 2 = 200% zoom */
	z: number
	/** User-defined metadata for the camera */
	meta: JsonObject
}

/**
 * Branded string type for camera record identifiers.
 * Prevents mixing camera IDs with other types of record IDs at compile time.
 *
 * @example
 * ```ts
 * import { CameraRecordType } from '@tldraw/tlschema'
 *
 * // Create a camera ID (typically one per user/session)
 * const cameraId: TLCameraId = CameraRecordType.createId()
 *
 * // Use in camera records
 * const camera: TLCamera = {
 *   id: cameraId,
 *   typeName: 'camera',
 *   x: 0, y: 0, z: 1,
 *   meta: {}
 * }
 *
 * // Get camera from store
 * const currentCamera = store.get(cameraId)
 * ```
 *
 * @public
 */
export type TLCameraId = RecordId<TLCamera>

/**
 * Validator for TLCamera records that ensures runtime type safety.
 * Validates camera position coordinates and zoom level.
 *
 * @example
 * ```ts
 * // Validation happens automatically when cameras are stored
 * try {
 *   const validatedCamera = cameraValidator.validate(cameraData)
 *   store.put([validatedCamera])
 * } catch (error) {
 *   console.error('Camera validation failed:', error.message)
 * }
 * ```
 *
 * @public
 */
export const cameraValidator: T.Validator<TLCamera> = T.model(
	'camera',
	T.object({
		typeName: T.literal('camera'),
		id: idValidator<TLCameraId>('camera'),
		x: T.number,
		y: T.number,
		z: T.number,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/**
 * Migration version identifiers for camera record schema evolution.
 * Each version represents a breaking change that requires data migration.
 *
 * @example
 * ```ts
 * // Check if a camera needs migration
 * const needsMigration = currentVersion < cameraVersions.AddMeta
 * ```
 *
 * @public
 */
export const cameraVersions = createMigrationIds('com.tldraw.camera', {
	AddMeta: 1,
})

/**
 * Migration sequence for evolving camera record structure over time.
 * Handles converting camera records from older schema versions to current format.
 *
 * @example
 * ```ts
 * // Migration is applied automatically when loading old documents
 * const migratedStore = migrator.migrateStoreSnapshot({
 *   schema: oldSchema,
 *   store: oldStoreSnapshot
 * })
 * ```
 *
 * @public
 */
export const cameraMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.camera',
	recordType: 'camera',
	sequence: [
		{
			id: cameraVersions.AddMeta,
			up: (record) => {
				;(record as any).meta = {}
			},
		},
	],
})

/**
 * Record type definition for TLCamera with validation and default properties.
 * Configures cameras as session-scoped records that don't persist across sessions.
 *
 * @example
 * ```ts
 * // Create a new camera record with defaults
 * const cameraRecord = CameraRecordType.create({
 *   id: 'camera:main'
 *   // x: 0, y: 0, z: 1, meta: {} are applied as defaults
 * })
 *
 * // Create with custom position and zoom
 * const customCamera = CameraRecordType.create({
 *   id: 'camera:user1',
 *   x: -100,
 *   y: -50,
 *   z: 1.5,
 *   meta: { userId: 'user123' }
 * })
 *
 * // Store the camera
 * store.put([cameraRecord])
 * ```
 *
 * @public
 */
export const CameraRecordType = createRecordType<TLCamera>('camera', {
	validator: cameraValidator,
	scope: 'session',
}).withDefaultProperties(
	(): Omit<TLCamera, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		z: 1,
		meta: {},
	})
)
