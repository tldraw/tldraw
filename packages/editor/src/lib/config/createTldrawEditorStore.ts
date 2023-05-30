import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	TLStore,
	createTldrawEditorSchema,
} from '@tldraw/tlschema'
import { Migrations, Store, StoreSnapshot } from '@tldraw/tlstore'
import { TLShapeUtilConstructor } from '../app/shapeutils/TLShapeUtil'

/** @public */
export type TldrawEditorStore =
	| {
			readonly status: 'not-synced'
			readonly store: TLStore
			readonly error?: undefined
	  }
	| {
			readonly status: 'error'
			readonly store?: undefined
			readonly error: Error
	  }
	| {
			readonly status: 'loading'
			readonly store?: undefined
			readonly error?: undefined
	  }
	| {
			readonly status: 'synced'
			readonly store: TLStore
			readonly error?: undefined
	  }

/** @public */
export type TldrawEditorShapeInfo = {
	util: TLShapeUtilConstructor<any>
	migrations?: Migrations
	validator?: { validate: (record: any) => any }
}

/** @public */
export type TldrawEditorStoreOptions = {
	customShapes?: Record<string, TldrawEditorShapeInfo>
	instanceId?: TLInstanceId
	initialData?: StoreSnapshot<TLRecord>
}

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTldrawEditorStore(opts = {} as TldrawEditorStoreOptions): TLStore {
	const { customShapes = {}, instanceId = InstanceRecordType.createId(), initialData } = opts

	return new Store({
		schema: createTldrawEditorSchema({ customShapes }),
		initialData,
		props: {
			instanceId,
			documentId: TLDOCUMENT_ID,
		},
	})
}
