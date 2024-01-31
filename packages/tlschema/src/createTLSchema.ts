import { LegacyMigrator, MigrationOptions, Migrations, StoreSchema } from '@tldraw/store'
import { objectMapValues } from '@tldraw/utils'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import {
	assetMigrations,
	cameraMigrations,
	documentMigrations,
	instanceMigrations,
	instancePageStateMigrations,
	instancePresenceMigrations,
	pageMigrations,
	pointerMigrations,
	storeMigrations,
} from './legacy-migrations/legacy-migrations'
import { tldrawMigrations } from './migrations/tldrawMigrations'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { createInstanceRecordType } from './records/TLInstance'
import { PageRecordType } from './records/TLPage'
import { InstancePageStateRecordType } from './records/TLPageState'
import { PointerRecordType } from './records/TLPointer'
import { InstancePresenceRecordType } from './records/TLPresence'
import { TLRecord } from './records/TLRecord'
import { createShapeRecordType, getShapePropKeysByStyle } from './records/TLShape'
import { StyleProp } from './styles/StyleProp'

/** @public */
export type SchemaShapeInfo = {
	// eslint-disable-next-line deprecation/deprecation
	__legacyMigrations_do_not_update?: Migrations
	// TODO: add link to docs
	/**
	 * The way to specify migrations has changed. Please refer to [docs]
	 * @deprecated - The way to specify migrations has changed. Please refer to [docs]
	 */
	migrations?: never
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
export function createTLSchema({
	shapes,
	migrations,
}: {
	shapes: Record<string, SchemaShapeInfo>
	migrations?: MigrationOptions
}): TLSchema {
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
			migrations: migrations ?? {
				sequences: [{ sequence: tldrawMigrations, versionAtInstallation: 'root' }],
				// DO NOT DO THIS (mapping over migrations to get the id ordering) IN USERLAND CODE
				// Doing this when you use your own migrations or 3rd party migrations is not safe.
				// You should always specify the order manually with an explicit array of migration IDs.
				order: tldrawMigrations.migrations.map((m) => m.id),
			},
		}
	)
}
