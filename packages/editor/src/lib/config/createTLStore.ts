import { HistoryEntry, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import {
	SchemaShapeInfo,
	TLRecord,
	TLStore,
	TLStoreProps,
	TLUnknownShape,
	createTLSchema,
} from '@tldraw/tlschema'
import { TLShapeUtilConstructor } from '../editor/shapes/ShapeUtil'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'

/** @public */
export type TLStoreOptions = {
	initialData?: SerializedStore<TLRecord>
	defaultName?: string
} & (
	| { shapeUtils: readonly TLAnyShapeUtilConstructor[] }
	| { schema: StoreSchema<TLRecord, TLStoreProps> }
)

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
		'schema' in rest
			? rest.schema
			: createTLSchema({
					shapes: shapeUtilsToShapesMap(checkShapesAndAddCore(rest.shapeUtils)),
			  })
	return new Store({
		schema,
		initialData,
		props: {
			defaultName,
		},
	})
}

function shapeUtilsToShapesMap(shapeUtils: TLShapeUtilConstructor<TLUnknownShape>[]) {
	return Object.fromEntries(
		shapeUtils.map((s): [string, SchemaShapeInfo] => [
			s.type,
			{
				props: s.props,
				migrations: s.migrations,
			},
		])
	)
}
