import { Store, StoreSnapshot } from '@tldraw/store'
import { TLRecord, TLStore, createTLSchema } from '@tldraw/tlschema'
import { TLShapeInfo } from './createShape'

/** @public */
export type TLStoreOptions = {
	customShapes?: TLShapeInfo[]
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
	const { customShapes = [], initialData, defaultName = '' } = opts

	return new Store({
		schema: createTLSchema({ customShapes }),
		initialData,
		props: {
			defaultName,
		},
	})
}
