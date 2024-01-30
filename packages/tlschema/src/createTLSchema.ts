import { Migrations, StoreSchema } from '@tldraw/store'
import { LegacyMigrator } from '@tldraw/store'
import { objectMapValues } from '@tldraw/utils'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { AssetRecordType, assetMigrations } from './records/TLAsset'
import { CameraRecordType, cameraMigrations } from './records/TLCamera'
import { DocumentRecordType, documentMigrations } from './records/TLDocument'
import { createInstanceRecordType, instanceMigrations } from './records/TLInstance'
import { PageRecordType, pageMigrations } from './records/TLPage'
import { InstancePageStateRecordType, instancePageStateMigrations } from './records/TLPageState'
import { PointerRecordType, pointerMigrations } from './records/TLPointer'
import { InstancePresenceRecordType, instancePresenceMigrations } from './records/TLPresence'
import { TLRecord } from './records/TLRecord'
import { createShapeRecordType, getShapePropKeysByStyle } from './records/TLShape'
import { storeMigrations } from './store-migrations'
import { StyleProp } from './styles/StyleProp'

/** @public */
export type SchemaShapeInfo = {
	// eslint-disable-next-line deprecation/deprecation
	migrations?: Migrations
	suppressMigrationDeprecationWarning?: boolean
	props?: Record<string, { validate: (prop: any) => any }>
	meta?: Record<string, { validate: (prop: any) => any }>
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
	const stylesById = new Map<string, StyleProp<unknown>>()
	for (const shape of objectMapValues(shapes)) {
		for (const style of getShapePropKeysByStyle(shape.props ?? {}).keys()) {
			if (stylesById.has(style.id) && stylesById.get(style.id) !== style) {
				throw new Error(`Multiple StyleProp instances with the same id: ${style.id}`)
			}
			stylesById.set(style.id, style)
		}
	}

	const { ShapeRecordType, legacyShapeMigrations } = createShapeRecordType(shapes)
	const InstanceRecordType = createInstanceRecordType(stylesById)

	const __legacyMigrator = new LegacyMigrator(
		{
			asset: assetMigrations,
			camera: cameraMigrations,
			document: documentMigrations,
			instance: instanceMigrations,
			instance_page_state: instancePageStateMigrations,
			page: pageMigrations,
			shape: legacyShapeMigrations,
			instance_presence: instancePresenceMigrations,
			pointer: pointerMigrations,
		},
		storeMigrations
	)

	return StoreSchema.create(
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
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			__legacyMigrator,
		}
	)
}
