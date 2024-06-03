import { HistoryEntry, MigrationSequence, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import { SchemaPropsInfo, TLRecord, TLStore, TLStoreProps, createTLSchema } from '@tldraw/tlschema'
import { TLAnyBindingUtilConstructor, checkBindings } from './defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'

/** @public */
export type TLStoreOptions = {
	initialData?: SerializedStore<TLRecord>
	defaultName?: string
	id?: string
} & (
	| {
			shapeUtils?: readonly TLAnyShapeUtilConstructor[]
			migrations?: readonly MigrationSequence[]
			bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	  }
	| { schema?: StoreSchema<TLRecord, TLStoreProps> }
)

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

/**
 * A helper for creating a TLStore. Custom shapes cannot override default shapes.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore({
	initialData,
	defaultName = '',
	id,
	...rest
}: TLStoreOptions): TLStore {
	const schema =
		'schema' in rest && rest.schema
			? // we have a schema
				rest.schema
			: // we need a schema
				createTLSchema({
					shapes: utilsToMap(
						checkShapesAndAddCore('shapeUtils' in rest && rest.shapeUtils ? rest.shapeUtils : [])
					),
					bindings: utilsToMap(
						checkBindings('bindingUtils' in rest && rest.bindingUtils ? rest.bindingUtils : [])
					),
					migrations: 'migrations' in rest ? rest.migrations : [],
				})

	return new Store({
		id,
		schema,
		initialData,
		props: {
			defaultName,
		},
	})
}

function utilsToMap<T extends SchemaPropsInfo & { type: string }>(utils: T[]) {
	return Object.fromEntries(
		utils.map((s): [string, SchemaPropsInfo] => [
			s.type,
			{
				props: s.props,
				migrations: s.migrations,
			},
		])
	)
}
