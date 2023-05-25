import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	TLStoreProps,
	TLUserId,
	UserRecordType,
	createTLSchema,
} from '@tldraw/tlschema'
import { Store, StoreSchema, StoreSnapshot } from '@tldraw/tlstore'

/** @public */
export function createTldrawEditorStore(
	opts = {} as {
		schema?: StoreSchema<TLRecord, TLStoreProps>
		userId?: TLUserId
		instanceId?: TLInstanceId
		initialData?: StoreSnapshot<TLRecord>
	}
) {
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
