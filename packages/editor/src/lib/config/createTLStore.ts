import { Store, StoreSnapshot } from '@tldraw/store'
import { TLInstanceId, TLRecord, TLStore, createTLSchema } from '@tldraw/tlschema'
import { mapObjectMap } from '@tldraw/utils'

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
	const { customShapes = {}, initialData, defaultName = '' } = opts

	return new Store({
		schema: createTLSchema({
			customShapes: mapObjectMap(customShapes, (_, Util) => new Util(null, Util.type)),
		}),
		initialData,
		props: {
			defaultName,
		},
	})
}
