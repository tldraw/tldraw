import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLInstancePresence,
	TLRecord,
	TLStore,
	TLStoreProps,
	TLUserId,
	UserRecordType,
	createTLSchema,
} from '@tldraw/tlschema'
import { Migrator, Store, StoreSchema, StoreSnapshot } from '@tldraw/tlstore'
import { Signal } from 'signia'

export function createTldrawEditorSchema(
	opts = {} as {
		migrators?: Record<string, Migrator>
		validator?: { validate: (record: TLRecord) => TLRecord } | null
		/** @internal */
		derivePresenceState?: (store: TLStore) => Signal<TLInstancePresence | null>
	}
) {
	const { migrators = null, validator = null, derivePresenceState } = opts

	return createTLSchema({
		derivePresenceState,
		validator,
		migrators,
	})
}

export function createTldrawEditorStore(opts: {
	schema?: StoreSchema<TLRecord, TLStoreProps>
	userId?: TLUserId
	instanceId?: TLInstanceId
	initialData?: StoreSnapshot<TLRecord>
}) {
	const {
		schema = createTLSchema(),
		userId = UserRecordType.createId(),
		instanceId = InstanceRecordType.createId(),
		initialData,
	} = opts

	return new Store({
		schema,
		initialData,
		props: {
			userId,
			instanceId,
			documentId: TLDOCUMENT_ID,
		},
	})
}
