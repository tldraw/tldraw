import { Migrator, StoreSchema } from '@tldraw/tlstore'
import { TLRecord } from './TLRecord'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { defaultSnapshotMigrator } from './defaultSnapshotMigrator'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { InstanceRecordType } from './records/TLInstance'
import { InstancePageStateRecordType } from './records/TLInstancePageState'
import { InstancePresenceRecordType } from './records/TLInstancePresence'
import { PageRecordType } from './records/TLPage'
import { TLPointer } from './records/TLPointer'
import { ShapeRecordType } from './records/TLShape'
import { UserDocumentRecordType } from './records/TLUserDocument'

/**
 * Create a store schema for a tldraw store that includes all the default shapes together with any custom shapes.
 *  @public */
export function createTLSchema(
	opts = {} as {
		validator?: { validate: (record: any) => TLRecord } | null
		migrators?: Record<TLRecord['typeName'], Migrator> | null
	}
) {
	const {
		validator = null,
		migrators = null,
		// customShapes = {},
	} = opts
	// const defaultShapeSubTypeEntries = Object.entries(DEFAULT_SHAPES) as [
	// 	TLShape['type'],
	// 	DefaultShapeInfo
	// ][]

	// Create a shape record that incorporates the default shapes and any custom shapes
	// into its subtype migrations and validators, so that we can migrate any new custom
	// subtypes. Note that migrations AND validators for custom shapes are optional. If
	// not provided, we use an empty migrations set and/or an "any" validator.

	// const customShapeSubTypeEntries = Object.entries(customShapes) as [T['type'], CustomShapeInfo][]
	// const shapeSubTypeMigratorWithCustomSubTypeMigrator = {
	// 	...Object.fromEntries(defaultShapeSubTypeEntries.map(([k, v]) => [k, v.migrations])),
	// 	...Object.fromEntries(
	// 		customShapeSubTypeEntries.map(([k, v]) => [k, v.migrations ?? new Migrator({})])
	// 	),
	// }

	// migrations: new Migrator({
	// 	currentVersion: rootShapeTypeMigrator.currentVersion,
	// 	firstVersion: rootShapeTypeMigrator.firstVersion,
	// 	migrators: rootShapeTypeMigrator.migrators,
	// 	subTypeKey: 'type',
	// 	subTypeMigrator: shapeSubTypeMigratorWithCustomSubTypeMigrator,
	// }),

	// const shapeRecord = createRecordType<TLShape>('shape', {
	// 	scope: 'document',
	// }).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
			asset: AssetRecordType,
			camera: CameraRecordType,
			document: DocumentRecordType,
			instance: InstanceRecordType,
			instance_page_state: InstancePageStateRecordType,
			page: PageRecordType,
			shape: ShapeRecordType,
			user_document: UserDocumentRecordType,
			instance_presence: InstancePresenceRecordType,
			pointer: TLPointer,
		},
		{
			snapshotMigrator: defaultSnapshotMigrator,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			validator,
			migrators,
		}
	)
}
