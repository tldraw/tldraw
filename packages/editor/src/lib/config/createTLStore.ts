import { Signal } from '@tldraw/state'
import { HistoryEntry, StoreSchema, StoreSnapshot, SyncStore } from '@tldraw/store'
import {
	TLInstancePresence,
	TLRecord,
	TLStore,
	TLStoreProps,
	createTLSchema,
} from '@tldraw/tlschema'
import { checkShapesAndAddCore } from './defaultShapes'
import { AnyTLShapeInfo, TLShapeInfo } from './defineShape'

/** @public */
export type TLStoreOptions = {
	initialData?: StoreSnapshot<TLRecord>
	defaultName?: string
	presence?: Signal<TLInstancePresence>
} & ({ shapes: readonly AnyTLShapeInfo[] } | { schema: StoreSchema<TLRecord, TLStoreProps> })

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore({ defaultName = '', ...rest }: TLStoreOptions): TLStore {
	const schema =
		'schema' in rest
			? rest.schema
			: createTLSchema({ shapes: shapesArrayToShapeMap(checkShapesAndAddCore(rest.shapes)) })
	return new SyncStore<TLRecord, TLStoreProps>(
		schema,
		{ defaultName },
		rest.presence,
		undefined
	)
}

function shapesArrayToShapeMap(shapes: TLShapeInfo[]) {
	return Object.fromEntries(shapes.map((s) => [s.type, s]))
}
