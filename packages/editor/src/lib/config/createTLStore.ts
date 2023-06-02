import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	TLStore,
	createTLSchema,
} from '@tldraw/tlschema'
import { Migrations, Store, StoreSnapshot } from '@tldraw/tlstore'
import { TLShapeUtilConstructor } from '../app/shapeutils/TLShapeUtil'

/** @public */
export type ShapeInfo = {
	util: TLShapeUtilConstructor<any>
	migrations?: Migrations
	validator?: { validate: (record: any) => any }
}

/** @public */
export type StoreOptions = {
	customShapes?: Record<string, ShapeInfo>
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
export function createTLStore(opts = {} as StoreOptions): TLStore {
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
