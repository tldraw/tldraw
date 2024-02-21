import { Migrations, StoreSchema } from '@tldraw/store'
import { objectMapKeys } from '@tldraw/utils'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
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
import { storeMigrations } from './store-migrations'
import { StyleProp } from './styles/StyleProp'

type AnyValidator = {
	validate: (prop: any) => any
	validateUsingKnownGoodVersion?: (prevVersion: any, newVersion: any) => any
}

/** @public */
export type SchemaShapeInfo = {
	migrations?: Migrations
	props?: Record<string, AnyValidator>
	meta?: Record<string, AnyValidator>
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
	const stylesById = new Map<string, Map<string, StyleProp<unknown>>>()
	for (const shapeType of objectMapKeys(shapes)) {
		const shape = shapes[shapeType]
		for (const style of getShapePropKeysByStyle(shape.props ?? {}).keys()) {
			let styleById = stylesById.get(style.id)
			if (!styleById) {
				styleById = new Map<string, StyleProp<unknown>>()
				stylesById.set(style.id, styleById)
			}

			if (styleById.has(style.id) && styleById.get(style.id) !== style) {
				throw new Error(`Multiple StyleProp instances with the same id: ${style.id}`)
			}
			styleById.set(shapeType, style)
		}
	}

	const ShapeRecordType = createShapeRecordType(shapes)
	const InstanceRecordType = createInstanceRecordType(stylesById)

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
			snapshotMigrations: storeMigrations,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
		}
	)
}
