import { Migrator, StoreSchema } from '@tldraw/tlstore'
import { Signal } from 'signia'
import { TLRecord } from './TLRecord'
import { TLStore, TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { defaultDerivePresenceState } from './defaultDerivePresenceState'
import { defaultSnapshotMigrator } from './defaultSnapshotMigrator'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { InstanceRecordType } from './records/TLInstance'
import { InstancePageStateRecordType } from './records/TLInstancePageState'
import { InstancePresenceRecordType, TLInstancePresence } from './records/TLInstancePresence'
import { PageRecordType } from './records/TLPage'
import { ShapeRecordType } from './records/TLShape'
import { UserRecordType } from './records/TLUser'
import { UserDocumentRecordType } from './records/TLUserDocument'
import { UserPresenceRecordType } from './records/TLUserPresence'

/**
 * Create a store schema for a tldraw store that includes all the default shapes together with any custom shapes.
 *  @public */
export function createTLSchema(
	opts = {} as {
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
		validateRecord?: (record: TLRecord) => TLRecord
		migrators?: Record<TLRecord['typeName'], Migrator>
	}
) {
	const {
		validateRecord,
		derivePresenceState,
		migrators = {},
		// customShapes = {},
	} = opts

	// const defaultShapeSubTypeEntries = Object.entries(DEFAULT_SHAPES) as [
	// 	TLShape['type'],
	// 	DefaultShapeInfo
	// ][]

	// Create a shape record that incorporates the defeault shapes and any custom shapes
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
			user: UserRecordType,
			user_document: UserDocumentRecordType,
			user_presence: UserPresenceRecordType,
			instance_presence: InstancePresenceRecordType,
		},
		{
			snapshotMigrator: defaultSnapshotMigrator,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			derivePresenceState: derivePresenceState ?? defaultDerivePresenceState,
			validateRecord,
			migrators,
		}
	)
}
