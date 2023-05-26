import { Migrator, StoreSchema, createRecordType } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLRecord } from './TLRecord'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { defaultSnapshotMigrator } from './defaultSnapshotMigrator'
import { defaultTldrawEditorMigrators } from './defaultTldrawEditorMigrators'
import { TLAsset } from './records/TLAsset'
import { TLCamera } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance } from './records/TLInstance'
import { TLInstancePageState } from './records/TLInstancePageState'
import { TLInstancePresence } from './records/TLInstancePresence'
import { TLPage } from './records/TLPage'
import { TLPointer } from './records/TLPointer'
import { TLShape, TLUnknownShape } from './records/TLShape'
import { TLUserDocument } from './records/TLUserDocument'
import { arrowShapeTypeValidator } from './shapes/TLArrowShape'
import { bookmarkShapeTypeValidator } from './shapes/TLBookmarkShape'
import { drawShapeTypeValidator } from './shapes/TLDrawShape'
import { embedShapeTypeValidator } from './shapes/TLEmbedShape'
import { frameShapeTypeValidator } from './shapes/TLFrameShape'
import { geoShapeTypeValidator } from './shapes/TLGeoShape'
import { groupShapeTypeValidator } from './shapes/TLGroupShape'
import { imageShapeTypeValidator } from './shapes/TLImageShape'
import { lineShapeTypeValidator } from './shapes/TLLineShape'
import { noteShapeTypeValidator } from './shapes/TLNoteShape'
import { textShapeTypeValidator } from './shapes/TLTextShape'
import { videoShapeTypeValidator } from './shapes/TLVideoShape'

type DefaultShapeInfo<T extends TLShape> = {
	validator: T.Validator<T>
}

const DEFAULT_SHAPES: { [K in TLShape['type']]: DefaultShapeInfo<Extract<TLShape, { type: K }>> } =
	{
		arrow: { validator: arrowShapeTypeValidator },
		bookmark: { validator: bookmarkShapeTypeValidator },
		draw: { validator: drawShapeTypeValidator },
		embed: { validator: embedShapeTypeValidator },
		frame: { validator: frameShapeTypeValidator },
		geo: { validator: geoShapeTypeValidator },
		group: { validator: groupShapeTypeValidator },
		image: { validator: imageShapeTypeValidator },
		line: { validator: lineShapeTypeValidator },
		note: { validator: noteShapeTypeValidator },
		text: { validator: textShapeTypeValidator },
		video: { validator: videoShapeTypeValidator },
	}

type CustomShapeInfo<T extends TLUnknownShape> = {
	migrator?: Migrator
	validator?: { validate: (record: T) => T }
}

/**
 * Create a store schema for a tldraw store that includes all the default shapes together with any custom shapes.
 *  @public */
export function createTLSchema<T extends TLUnknownShape>(
	opts = {} as {
		customShapes?: { [K in T['type']]: CustomShapeInfo<T> }
	}
) {
	const { customShapes = {} } = opts

	const defaultShapeSubTypeEntries = Object.entries(DEFAULT_SHAPES) as [
		TLShape['type'],
		DefaultShapeInfo<TLShape>
	][]

	const customShapeSubTypeEntries = Object.entries(customShapes) as [
		T['type'],
		CustomShapeInfo<T>
	][]

	// Create a shape record that incorporates the default shapes and any custom shapes
	// into its subtype migrations and validators, so that we can migrate any new custom
	// subtypes. Note that migrations AND validators for custom shapes are optional. If
	// not provided, we use an empty migrations set and/or an "any" validator.

	const validatorWithCustomShapeValidators = T.model(
		'shape',
		T.union('type', {
			...Object.fromEntries(defaultShapeSubTypeEntries.map(([k, v]) => [k, v.validator])),
			...Object.fromEntries(
				customShapeSubTypeEntries.map(([k, v]) => [k, (v.validator as T.Validator<any>) ?? T.any])
			),
		})
	)

	const shapeRecord = createRecordType<TLShape>('shape', {
		validator: validatorWithCustomShapeValidators,
		scope: 'document',
	}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
			asset: TLAsset,
			camera: TLCamera,
			document: TLDocument,
			instance: TLInstance,
			instance_page_state: TLInstancePageState,
			page: TLPage,
			shape: shapeRecord,
			user_document: TLUserDocument,
			instance_presence: TLInstancePresence,
			pointer: TLPointer,
		},
		{
			snapshotMigrator: defaultSnapshotMigrator,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			migrators: {
				...defaultTldrawEditorMigrators,
				shape: defaultTldrawEditorMigrators.shape.withSubTypeMigrators('type', {
					...defaultTldrawEditorMigrators.shape.subTypeMigrators,
					...Object.fromEntries(
						customShapeSubTypeEntries.map(([k, v]) => [k, v.migrator ?? new Migrator()])
					),
				}),
			},
		}
	)
}
