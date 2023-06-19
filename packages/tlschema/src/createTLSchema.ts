import { Migrations, StoreSchema } from '@tldraw/store'
import { hasOwnProperty, objectMapValues } from '@tldraw/utils'
import { assert } from 'console'
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
import { createShapeRecordType } from './records/TLShape'
import { ShapeDefProp } from './shapes/TLBaseShape'
import { storeMigrations } from './store-migrations'
import { StyleProp, StylePropInstance, StylePropInstances, isStyleProp } from './styles/StyleProp'

/** @public */
export type SchemaShapeInfo = {
	type: string
	migrations?: Migrations
	props?: Record<string, ShapeDefProp<any>>
}

/** @public */
export type SchemaOpts = {
	shapes: readonly SchemaShapeInfo[]
	styles?: readonly StylePropInstance<unknown>[]
}

/** @public */
export type TLSchema = StoreSchema<TLRecord, TLStoreProps>

/**
 * Create a TLSchema with custom shapes. Custom shapes cannot override default shapes.
 *
 * @param opts - Options
 *
 * @public */
export function createTLSchema(opts: SchemaOpts): TLSchema {
	const shapes = shapesArrayToShapeMap(opts.shapes)
	const styleInstances = getStyleInstances(opts.shapes, opts.styles)

	const ShapeRecordType = createShapeRecordType(shapes, styleInstances)
	const InstanceRecordType = createInstanceRecordType(styleInstances)

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

/** @internal */
export function getStyleInstances(
	shapes: readonly SchemaShapeInfo[],
	styles?: readonly StylePropInstance<unknown>[]
): StylePropInstances {
	const providedStyleInstances = new Map<StyleProp<unknown>, StylePropInstance<unknown>>()
	for (const style of styles ?? []) {
		const ctor = style.constructor as StyleProp<unknown>
		if (providedStyleInstances.has(ctor)) {
			throw new Error(`Multiple style prop instances provided for style '${style.id}'`)
		}
		providedStyleInstances.set(ctor, style)
	}

	const stylePropsByConstructor = new Map<StyleProp<unknown>, StylePropInstance<unknown>>()
	for (const shape of shapes) {
		if (!shape.props) continue

		for (const prop of objectMapValues(shape.props)) {
			if (!isStyleProp(prop)) continue
			const Ctor: StyleProp<unknown> = prop

			if (stylePropsByConstructor.has(Ctor)) continue

			const providedInstance = providedStyleInstances.get(Ctor)
			if (providedInstance) {
				providedStyleInstances.delete(Ctor)
				stylePropsByConstructor.set(Ctor, providedInstance)
			} else {
				stylePropsByConstructor.set(Ctor, new Ctor())
			}
		}
	}

	for (const instance of providedStyleInstances.values()) {
		throw new Error(
			`Provided style prop instance for ${instance.id} but it is not referenced in shapes`
		)
	}

	const stylePropsById = new Map<string, StylePropInstance<unknown>>()
	for (const style of stylePropsByConstructor.values()) {
		if (stylePropsById.has(style.id)) {
			throw new Error(`Multiple style props with id ${style.id} provided`)
		}
		assert(
			style.id === (style.constructor as StyleProp<unknown>).id,
			`Static and instance style ids must match`
		)
		stylePropsById.set(style.id, style)
	}

	return { stylePropsByConstructor, stylePropsById }
}

function shapesArrayToShapeMap(shapes: readonly SchemaShapeInfo[]) {
	const shapesMap: Record<string, SchemaShapeInfo> = {}
	for (const shape of shapes) {
		if (hasOwnProperty(shapesMap, shape.type)) {
			throw new Error(`Multiple shapes with type ${shape.type} provided`)
		}
		shapesMap[shape.type] = shape
	}
	return shapesMap
}
