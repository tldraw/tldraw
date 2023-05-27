import {
	InstanceRecordType,
	TLDOCUMENT_ID,
	TLInstanceId,
	TLRecord,
	createTLSchema,
} from '@tldraw/tlschema'
import { Migrations, Store, StoreSnapshot } from '@tldraw/tlstore'
import { TLShapeUtilConstructor } from '../app/shapeutils/TLShapeUtil'

import { TLStore } from '@tldraw/tlschema'

/** @public */
export type SyncedStore =
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

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTldrawEditorStore(
	opts = {} as {
		customShapes?: Record<string, TldrawEditorShapeInfo>
		instanceId?: TLInstanceId
		initialData?: StoreSnapshot<TLRecord>
	}
): SyncedStore & { status: 'not-synced' } {
	const { customShapes = {}, instanceId = InstanceRecordType.createId(), initialData } = opts

	return {
		store: new Store({
			schema: createTLSchema({ customShapes }),
			initialData,
			props: {
				instanceId,
				documentId: TLDOCUMENT_ID,
			},
		}),
		error: undefined,
		status: 'not-synced',
	}
}
