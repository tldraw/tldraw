import { HistoryEntry, Store, StoreSchema, StoreSnapshot } from '@tldraw/store'
import { TLRecord, TLStore, TLStoreProps, createTLSchema } from '@tldraw/tlschema'
import { AnyTLShapeInfo, TLShapeInfo } from './defineShape'

/** @public */
export type TLStoreOptions = {
	initialData?: StoreSnapshot<TLRecord>
	defaultName?: string
} & ({ shapes: AnyTLShapeInfo[] } | { schema: StoreSchema<TLRecord, TLStoreProps> })

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore({ initialData, defaultName = '', ...rest }: TLStoreOptions): TLStore {
	const schema =
		'schema' in rest ? rest.schema : createTLSchema({ shapes: shapesArrayToShapeMap(rest.shapes) })
	return new Store({
		schema,
		initialData,
		props: {
			defaultName,
		},
	})
}

export function shapesArrayToShapeMap(shapes: TLShapeInfo[]) {
	return Object.fromEntries(shapes.map((s) => [s.type, s]))
}
