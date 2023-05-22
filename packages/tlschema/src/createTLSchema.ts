import {
	Migrations,
	StoreSchema,
	StoreValidator,
	createRecordType,
	defineMigrations,
} from '@tldraw/tlstore'
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
import { TLShape, rootShapeTypeMigrations } from './records/TLShape'
import { TLUser } from './records/TLUser'
import { TLUserDocument } from './records/TLUserDocument'
import { TLUserPresence } from './records/TLUserPresence'
import { storeMigrations } from './schema'
import { TLBaseShape } from './shapes/shape-validation'

/** @public */
export type ValidatorsForShapes<T extends TLBaseShape<any, any>> = Record<
	T['type'],
	{ validate: (record: T) => T } | undefined
>

/** @public */
export type MigrationsForShapes<T extends TLBaseShape<any, any>> = Record<
	T['type'],
	Migrations | undefined
>

/** @public */
export type CustomShapeTypeInfo = {
	type: string
	migrations?: Migrations
	validator?: StoreValidator<TLShape>
}

/** @public */
export function createTLSchema({
	migrations,
	validators,
	allowUnknownShapes,
	derivePresenceState,
}: {
	validators: ValidatorsForShapes<TLShape>
	migrations: MigrationsForShapes<TLShape>
	customShapeDefs?: readonly CustomShapeTypeInfo[]
	allowUnknownShapes?: boolean
	derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
}) {
	// Removed check to see whether a shape type has already been defined

	const shapeTypeMigrations = defineMigrations({
		currentVersion: rootShapeTypeMigrations.currentVersion,
		firstVersion: rootShapeTypeMigrations.firstVersion,
		migrators: rootShapeTypeMigrations.migrators,
		subTypeKey: 'type',
		subTypeMigrations: Object.fromEntries(
			Object.entries(migrations).map(([type, migrations]) => [type, migrations ?? {}]) as [
				TLShape['id'],
				Migrations
			][]
		),
	})

	const shapeTypeValidator = T.union(
		'type',
		Object.fromEntries(
			Object.entries(validators).filter(([_, validator]) => validator) as [
				TLShape['id'],
				T.Validator<TLShape>
			][]
		)
	)

	const shapeRecord = createRecordType<TLShape>('shape', {
		migrations: shapeTypeMigrations,
		validator: allowUnknownShapes ? undefined : shapeTypeValidator,
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
		}
	)
}
