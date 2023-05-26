import { Migrator, StoreSchema } from '@tldraw/tlstore'
import { TLRecord } from './TLRecord'
import { TLStoreProps, createIntegrityChecker, onValidationFailure } from './TLStore'
import { defaultSnapshotMigrator } from './defaultSnapshotMigrator'
import { AssetRecordType } from './records/TLAsset'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType } from './records/TLDocument'
import { InstanceRecordType } from './records/TLInstance'
import { InstancePageStateRecordType } from './records/TLInstancePageState'
import { InstancePresenceRecordType } from './records/TLInstancePresence'
import { PageRecordType } from './records/TLPage'
import { TLPointer } from './records/TLPointer'
import { ShapeRecordType } from './records/TLShape'
import { UserDocumentRecordType } from './records/TLUserDocument'

/** @public */
export type TldrawEditorMigrators = Record<string, Migrator>

/** @public */
export type TldrawEditorValidator = { validate: (record: TLRecord) => TLRecord }

/**
 * Create a store schema with the given migrators and validator.
 *
 *  @public */
export function createTldrawEditorSchema(
	opts = {} as {
		migrators?: TldrawEditorMigrators | null
		validator?: TldrawEditorValidator | null
	}
) {
	const { validator = null, migrators = null } = opts

	return StoreSchema.create<TLRecord, TLStoreProps>(
		{
			asset: AssetRecordType,
			camera: CameraRecordType,
			document: DocumentRecordType,
			instance: InstanceRecordType,
			instance_page_state: InstancePageStateRecordType,
			page: PageRecordType,
			shape: ShapeRecordType,
			user_document: UserDocumentRecordType,
			instance_presence: InstancePresenceRecordType,
			pointer: TLPointer,
		},
		{
			snapshotMigrator: defaultSnapshotMigrator,
			onValidationFailure,
			createIntegrityChecker: createIntegrityChecker,
			validator,
			migrators,
		}
	)
}
