import { Migrations, Store, StoreSnapshot } from '@tldraw/store'
import { TLShapeUtilConstructor } from '../editor/shapeutils/ShapeUtil'
import { TLStore } from '../schema/TLStore'
import { createTLSchema } from '../schema/createTLSchema'
import { TLRecord } from '../schema/records/TLRecord'

/** @public */
export type TLShapeInfo = {
	util: TLShapeUtilConstructor<any>
	migrations?: Migrations
	validator?: { validate: (record: any) => any }
}

/** @public */
export type TLStoreOptions = {
	customShapes?: Record<string, TLShapeInfo>
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
		schema: createTLSchema({ customShapes }),
		initialData,
		props: {
			defaultName,
		},
	})
}
