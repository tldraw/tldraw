import { Migrations, StoreSchema, createRecordType, defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { Signal } from 'signia'
import { TLRecord } from './TLRecord'
import { TLStore, TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { defaultDerivePresenceState } from './defaultDerivePresenceState'
import { TLAsset } from './records/TLAsset'
import { TLCamera } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance } from './records/TLInstance'
import { TLInstancePageState } from './records/TLInstancePageState'
import { TLInstancePresence } from './records/TLInstancePresence'
import { TLPage } from './records/TLPage'
import { TLShape, TLUnknownShape, rootShapeTypeMigrations } from './records/TLShape'
import { TLUser } from './records/TLUser'
import { TLUserDocument } from './records/TLUserDocument'
import { TLUserPresence } from './records/TLUserPresence'
import { storeMigrations } from './schema'
import { arrowShapeTypeMigrations, arrowShapeTypeValidator } from './shapes/TLArrowShape'
import { bookmarkShapeTypeMigrations, bookmarkShapeTypeValidator } from './shapes/TLBookmarkShape'
import { drawShapeTypeMigrations, drawShapeTypeValidator } from './shapes/TLDrawShape'
import { embedShapeTypeMigrations, embedShapeTypeValidator } from './shapes/TLEmbedShape'
import { frameShapeTypeMigrations, frameShapeTypeValidator } from './shapes/TLFrameShape'
import { geoShapeTypeMigrations, geoShapeTypeValidator } from './shapes/TLGeoShape'
import { groupShapeTypeMigrations, groupShapeTypeValidator } from './shapes/TLGroupShape'
import { imageShapeTypeMigrations, imageShapeTypeValidator } from './shapes/TLImageShape'
import { lineShapeTypeMigrations, lineShapeTypeValidator } from './shapes/TLLineShape'
import { noteShapeTypeMigrations, noteShapeTypeValidator } from './shapes/TLNoteShape'
import { textShapeTypeMigrations, textShapeTypeValidator } from './shapes/TLTextShape'
import { videoShapeTypeMigrations, videoShapeTypeValidator } from './shapes/TLVideoShape'

type DefaultShapeInfo<T extends TLShape> = {
	validator: T.Validator<T>
	migrations: Migrations
}

const DEFAULT_SHAPES: { [K in TLShape['type']]: DefaultShapeInfo<Extract<TLShape, { type: K }>> } =
	{
		arrow: { migrations: arrowShapeTypeMigrations, validator: arrowShapeTypeValidator },
		bookmark: { migrations: bookmarkShapeTypeMigrations, validator: bookmarkShapeTypeValidator },
		draw: { migrations: drawShapeTypeMigrations, validator: drawShapeTypeValidator },
		embed: { migrations: embedShapeTypeMigrations, validator: embedShapeTypeValidator },
		frame: { migrations: frameShapeTypeMigrations, validator: frameShapeTypeValidator },
		geo: { migrations: geoShapeTypeMigrations, validator: geoShapeTypeValidator },
		group: { migrations: groupShapeTypeMigrations, validator: groupShapeTypeValidator },
		image: { migrations: imageShapeTypeMigrations, validator: imageShapeTypeValidator },
		line: { migrations: lineShapeTypeMigrations, validator: lineShapeTypeValidator },
		note: { migrations: noteShapeTypeMigrations, validator: noteShapeTypeValidator },
		text: { migrations: textShapeTypeMigrations, validator: textShapeTypeValidator },
		video: { migrations: videoShapeTypeMigrations, validator: videoShapeTypeValidator },
	}

type CustomShapeInfo<T extends TLUnknownShape> = {
	validator?: { validate: (record: T) => T }
	migrations?: Migrations
}

/**
 * Create a store schema for a tldraw store that includes all the default shapes together with any custom shapes.
 *  @public */
export function createTLSchema<T extends TLUnknownShape>(
	opts = {} as {
		validate: boolean
		customShapes?: { [K in T['type']]: CustomShapeInfo<T> }
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}
) {
	const { validate = false, customShapes = {}, derivePresenceState } = opts

	const defaultShapeSubTypeEntries = Object.entries(DEFAULT_SHAPES) as [
		TLShape['type'],
		DefaultShapeInfo<TLShape>
	][]

	const customShapeSubTypeEntries = Object.entries(customShapes) as [
		T['type'],
		CustomShapeInfo<T>
	][]

	// Create a shape record that incorporates the defeault shapes and any custom shapes
	// into its subtype migrations and validators, so that we can migrate any new custom
	// subtypes. Note that migrations AND validators for custom shapes are optional. If
	// not provided, we use an empty migrations set and/or an "any" validator.

	const shapeSubTypeMigrationsWithCustomSubTypeMigrations = {
		...Object.fromEntries(defaultShapeSubTypeEntries.map(([k, v]) => [k, v.migrations])),
		...Object.fromEntries(
			customShapeSubTypeEntries.map(([k, v]) => [k, v.migrations ?? defineMigrations({})])
		),
	}

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
		migrations: defineMigrations({
			currentVersion: rootShapeTypeMigrations.currentVersion,
			firstVersion: rootShapeTypeMigrations.firstVersion,
			migrators: rootShapeTypeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: shapeSubTypeMigrationsWithCustomSubTypeMigrations,
		}),
		validator: validatorWithCustomShapeValidators,
		scope: 'document',
	}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))

	let recordTypes = {
		asset: TLAsset,
		camera: TLCamera,
		document: TLDocument,
		instance: TLInstance,
		instance_page_state: TLInstancePageState,
		page: TLPage,
		shape: shapeRecord,
		user: TLUser,
		user_document: TLUserDocument,
		user_presence: TLUserPresence,
		instance_presence: TLInstancePresence,
	}

	// Turn off all the validations if we're not validating
	if (!validate) {
		recordTypes = Object.fromEntries(
			Object.entries(recordTypes).map(([k, v]) => {
				v.validate = (r) => r as any
				return [k, v]
			})
		) as typeof recordTypes
	}

	return StoreSchema.create<TLRecord, TLStoreProps>(recordTypes, {
		snapshotMigrations: storeMigrations,
		onValidationFailure,
		createIntegrityChecker: createIntegrityChecker,
		derivePresenceState: derivePresenceState ?? defaultDerivePresenceState,
	})
}
