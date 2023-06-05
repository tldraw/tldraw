import { Store, StoreSnapshot } from '@tldraw/store'
import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	TLStore,
	TLUnknownShape,
	createTLSchema,
} from '@tldraw/tlschema'
import { mapObjectMap } from '@tldraw/utils'
import { TLShapeUtilConstructor } from '../app/shapeutils/ShapeUtil'

/** @public */
export type TLStoreOptions = {
	customShapes?: Record<string, TLShapeUtilConstructor<TLUnknownShape>>
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
		schema: createTLSchema({
			customShapes: mapObjectMap(customShapes, (_, Util) => new Util(null, Util.type)),
		}),
		initialData,
		props: {
			instanceId,
			documentId: TLDOCUMENT_ID,
			defaultName,
		},
	})
}
