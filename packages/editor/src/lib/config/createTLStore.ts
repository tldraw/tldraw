import { Migrations, Store, StoreSnapshot } from '@tldraw/store'
import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	TLStore,
	createTLSchema,
} from '@tldraw/tlschema'
import { TLShapeUtilConstructor } from '../app/shapeutils/ShapeUtil'

/** @public */
export type TLShapeInfo = {
	util: TLShapeUtilConstructor<any>
	migrations?: Migrations
	validator?: { validate: (record: any) => any }
}

/** @public */
export type TLStoreOptions = {
	customShapes?: Record<string, TLShapeInfo>
	instanceId?: TLInstanceId
	initialData?: StoreSnapshot<TLRecord>
	defaultName?: string
}

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore(opts = {} as TLStoreOptions): TLStore {
	const {
		customShapes = {},
		instanceId = InstanceRecordType.createId(),
		initialData,
		defaultName = '',
	} = opts

	return new Store({
		schema: createTLSchema({ customShapes }),
		initialData,
		props: {
			instanceId,
			documentId: TLDOCUMENT_ID,
			defaultName,
		},
	})
}
