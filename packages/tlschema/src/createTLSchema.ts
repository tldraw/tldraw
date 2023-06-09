import { Migrations, StoreSchema, createRecordType, defineMigrations } from '@tldraw/store'
import { mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { InstanceRecordType } from './records/TLInstance'
import { PageRecordType } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { PointerRecordType } from './records/TLPointer'
import { InstancePresenceRecordType } from './records/TLPresence'
import { TLRecord } from './records/TLRecord'
import { TLShape, rootShapeMigrations } from './records/TLShape'
import { createShapeValidator } from './shapes/TLBaseShape'
import { storeMigrations } from './store-migrations'

/** @public */
export type SchemaShapeInfo = {
	migrations?: Migrations
	props?: Record<string, { validate: (prop: any) => any }>
}

/** @public */
export type TLSchema = StoreSchema<TLRecord, TLStoreProps>

/**
 * Create a TLSchema with custom shapes. Custom shapes cannot override default shapes.
 *
 * @param opts - Options
 *
 * @public */
export function createTLSchema({ shapes }: { shapes: Record<string, SchemaShapeInfo> }): TLSchema {
	const ShapeRecordType = createRecordType<TLShape>('shape', {
		migrations: defineMigrations({
			currentVersion: rootShapeMigrations.currentVersion,
			firstVersion: rootShapeMigrations.firstVersion,
			migrators: rootShapeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: mapObjectMapValues(shapes, (k, v) => v.migrations ?? defineMigrations({})),
		}),
		scope: 'document',
		validator: T.model(
			'shape',
			T.union(
				'type',
				mapObjectMapValues(shapes, (type, { props }) => createShapeValidator(type, props))
			)
		),
	}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false, opacity: 1 }))

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
			asset: AssetRecordType,
			camera: CameraRecordType,
			document: DocumentRecordType,
			instance: InstanceRecordType,
			instance_page_state: InstancePageStateRecordType,
			page: PageRecordType,
			shape: ShapeRecordType,
			instance_presence: InstancePresenceRecordType,
			pointer: PointerRecordType,
		},
		{
			snapshotMigrations: storeMigrations,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
		}
	)
}
