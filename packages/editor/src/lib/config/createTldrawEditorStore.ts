import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	createTLSchema,
} from '@tldraw/tlschema'
import { Migrations, Store, StoreSnapshot } from '@tldraw/tlstore'
import { TLShapeUtilConstructor } from '../app/shapeutils/TLShapeUtil'

/** @public */
export type TldrawEditorShapeInfo = {
	util: TLShapeUtilConstructor<any>
	migrations?: Migrations
	validator?: { validate: (record: any) => any }
}

/** @public */
export function createTldrawEditorStore(
	opts = {} as {
		shapes?: Record<string, TldrawEditorShapeInfo>
		instanceId?: TLInstanceId
		initialData?: StoreSnapshot<TLRecord>
	}
) {
	const { shapes = {}, instanceId = InstanceRecordType.createId(), initialData } = opts

	return new Store({
		schema: createTLSchema({ shapes }),
		initialData,
		props: {
			instanceId,
			documentId: TLDOCUMENT_ID,
		},
	})
}
