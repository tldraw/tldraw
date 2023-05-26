import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	TLStoreProps,
} from '@tldraw/tlschema'
import { Store, StoreSchema, StoreSnapshot } from '@tldraw/tlstore'
import { createTldrawEditorSchema } from './createTldrawEditorSchema'

/** @public */
export function createTldrawEditorStore(
	opts = {} as {
		schema?: StoreSchema<TLRecord, TLStoreProps>
		instanceId?: TLInstanceId
		initialData?: StoreSnapshot<TLRecord>
	}
) {
	const {
		schema = createTldrawEditorSchema(),
		instanceId = InstanceRecordType.createId(),
		initialData,
	} = opts

	return new Store({
		schema,
		initialData,
		props: {
			instanceId,
			documentId: TLDOCUMENT_ID,
		},
	})
}
