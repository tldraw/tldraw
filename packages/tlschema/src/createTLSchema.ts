import { Migrations, StoreSchema, createRecordType, defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { Signal } from 'signia'
import { TLRecord } from './TLRecord'
import { TLStore, TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { bookmarkAssetTypeValidator } from './assets/TLBookmarkAsset'
import { imageAssetTypeValidator } from './assets/TLImageAsset'
import { videoAssetTypeValidator } from './assets/TLVideoAsset'
import { defaultDerivePresenceState } from './defaultDerivePresenceState'
import { TLAsset } from './records/TLAsset'
import { TLCamera, TLCameraId, cameraTypeValidator } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance, TLInstanceId } from './records/TLInstance'
import { TLInstancePageState, TLInstancePageStateId } from './records/TLInstancePageState'
import { TLInstancePresence, TLInstancePresenceID } from './records/TLInstancePresence'
import { TLPage, TLPageId } from './records/TLPage'
import { TLShape, TLShapeId, TLUnknownShape, rootShapeTypeMigrations } from './records/TLShape'
import { TLUser } from './records/TLUser'
import { TLUserDocument, TLUserDocumentId } from './records/TLUserDocument'
import { TLUserPresence, TLUserPresenceId } from './records/TLUserPresence'
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
import { cursorTypeValidator, cursorValidator, scribbleTypeValidator } from './ui-types'
import {
	alignValidator,
	arrowheadValidator,
	colorValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	geoValidator,
	iconValidator,
	idValidator,
	instanceIdValidator,
	opacityValidator,
	pageIdValidator,
	shapeIdValidator,
	sizeValidator,
	splineValidator,
	userIdValidator,
	verticalAlignValidator,
} from './validation'

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
		customShapes?: { [K in T['type']]: CustomShapeInfo<T> }
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}
) {
	const { customShapes = {}, derivePresenceState } = opts

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

	// const validatorWithCustomShapeValidators = T.model(
	// 	'shape',
	// 	T.union('type', {
	// 		...Object.fromEntries(defaultShapeSubTypeEntries.map(([k, v]) => [k, v.validator])),
	// 		...Object.fromEntries(
	// 			customShapeSubTypeEntries.map(([k, v]) => [k, (v.validator as T.Validator<any>) ?? T.any])
	// 		),
	// 	})
	// )

	const shapeRecord = createRecordType<TLShape>('shape', {
		migrations: defineMigrations({
			currentVersion: rootShapeTypeMigrations.currentVersion,
			firstVersion: rootShapeTypeMigrations.firstVersion,
			migrators: rootShapeTypeMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: shapeSubTypeMigrationsWithCustomSubTypeMigrations,
		}),
		scope: 'document',
	}).withDefaultProperties(() => ({ x: 0, y: 0, rotation: 0, isLocked: false }))

	const validateRecord = T.union('typeName', {
		asset: T.model(
			'asset',
			T.union('type', {
				image: imageAssetTypeValidator,
				video: videoAssetTypeValidator,
				bookmark: bookmarkAssetTypeValidator,
			})
		),
		camera: T.model(
			'camera',
			T.object({
				typeName: T.literal('camera'),
				id: idValidator<TLCameraId>('camera'),
				x: T.number,
				y: T.number,
				z: T.number,
			})
		),
		document: T.model(
			'document',
			T.object({
				typeName: T.literal('document'),
				id: T.literal('document:document' as TLDocument['id']),
				gridSize: T.number,
			})
		),
		instance: T.model(
			'instance',
			T.object({
				typeName: T.literal('instance'),
				id: idValidator<TLInstanceId>('instance'),
				userId: userIdValidator,
				currentPageId: pageIdValidator,
				followingUserId: userIdValidator.nullable(),
				brush: T.boxModel.nullable(),
				propsForNextShape: T.object({
					color: colorValidator,
					labelColor: colorValidator,
					dash: dashValidator,
					fill: fillValidator,
					size: sizeValidator,
					opacity: opacityValidator,
					font: fontValidator,
					align: alignValidator,
					verticalAlign: verticalAlignValidator,
					icon: iconValidator,
					geo: geoValidator,
					arrowheadStart: arrowheadValidator,
					arrowheadEnd: arrowheadValidator,
					spline: splineValidator,
				}),
				cursor: cursorValidator,
				scribble: scribbleTypeValidator.nullable(),
				isFocusMode: T.boolean,
				isDebugMode: T.boolean,
				isToolLocked: T.boolean,
				exportBackground: T.boolean,
				screenBounds: T.boxModel,
				zoomBrush: T.boxModel.nullable(),
			})
		),
		instance_page_state: T.model(
			'instance_page_state',
			T.object({
				typeName: T.literal('instance_page_state'),
				id: idValidator<TLInstancePageStateId>('instance_page_state'),
				instanceId: instanceIdValidator,
				pageId: pageIdValidator,
				cameraId: idValidator<TLCameraId>('camera'),
				selectedIds: T.arrayOf(shapeIdValidator),
				hintingIds: T.arrayOf(shapeIdValidator),
				erasingIds: T.arrayOf(shapeIdValidator),
				hoveredId: shapeIdValidator.nullable(),
				editingId: shapeIdValidator.nullable(),
				croppingId: shapeIdValidator.nullable(),
				focusLayerId: shapeIdValidator.nullable(),
			})
		),
		page: T.model(
			'page',
			T.object({
				typeName: T.literal('page'),
				id: pageIdValidator,
				name: T.string,
				index: T.string,
			})
		),
		shape: T.model(
			'shape',
			T.union('type', {
				arrow: arrowShapeTypeValidator,
				bookmark: bookmarkShapeTypeValidator,
				draw: drawShapeTypeValidator,
				embed: embedShapeTypeValidator,
				frame: frameShapeTypeValidator,
				geo: geoShapeTypeValidator,
				group: groupShapeTypeValidator,
				image: imageShapeTypeValidator,
				line: lineShapeTypeValidator,
				note: noteShapeTypeValidator,
				text: textShapeTypeValidator,
				video: videoShapeTypeValidator,
			})
		),
		user: T.model(
			'user',
			T.object({
				typeName: T.literal('user'),
				id: userIdValidator,
				name: T.string,
				locale: T.string,
			})
		),
		user_document: T.model(
			'user_document',
			T.object({
				typeName: T.literal('user_document'),
				id: idValidator<TLUserDocumentId>('user_document'),
				userId: userIdValidator,
				isPenMode: T.boolean,
				isGridMode: T.boolean,
				isDarkMode: T.boolean,
				isMobileMode: T.boolean,
				isSnapMode: T.boolean,
				lastUpdatedPageId: pageIdValidator.nullable(),
				lastUsedTabId: instanceIdValidator.nullable(),
			})
		),
		user_presence: T.model(
			'user_presence',
			T.object({
				typeName: T.literal('user_presence'),
				id: idValidator<TLUserPresenceId>('user_presence'),
				userId: userIdValidator,
				lastUsedInstanceId: instanceIdValidator.nullable(),
				lastActivityTimestamp: T.number,
				cursor: T.point,
				viewportPageBounds: T.boxModel,
				color: T.string,
			})
		),
		instance_presence: T.model(
			'instance_presence',
			T.object({
				instanceId: idValidator<TLInstanceId>('instance'),
				typeName: T.literal('instance_presence'),
				id: idValidator<TLInstancePresenceID>('instance_presence'),
				userId: userIdValidator,
				userName: T.string,
				lastActivityTimestamp: T.number,
				followingUserId: userIdValidator.nullable(),
				cursor: T.object({
					x: T.number,
					y: T.number,
					type: cursorTypeValidator,
					rotation: T.number,
				}),
				color: T.string,
				camera: cameraTypeValidator,
				screenBounds: T.boxModel,
				selectedIds: T.arrayOf(idValidator<TLShapeId>('shape')),
				currentPageId: idValidator<TLPageId>('page'),
				brush: T.boxModel.nullable(),
				scribble: scribbleTypeValidator.nullable(),
			})
		),
	})

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
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
		},
		{
			snapshotMigrations: storeMigrations,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			derivePresenceState: derivePresenceState ?? defaultDerivePresenceState,
			validateRecord: validateRecord.validate,
		}
	)
}
