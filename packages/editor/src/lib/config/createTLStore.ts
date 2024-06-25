import { HistoryEntry, MigrationSequence, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import { SchemaPropsInfo, TLRecord, TLStore, TLStoreProps, createTLSchema } from '@tldraw/tlschema'
import { TLAnyBindingUtilConstructor, checkBindings } from './defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'

/** @public */
export interface TLStoreBaseOptions {
	/** The initial data for the store. */
	initialData?: SerializedStore<TLRecord>

	/** The default name for the store. */
	defaultName?: string
}

/** @public */
export type TLStoreOptions = TLStoreBaseOptions &
	(
		| {
				id?: string
				shapeUtils?: readonly TLAnyShapeUtilConstructor[]
				migrations?: readonly MigrationSequence[]
				bindingUtils?: readonly TLAnyBindingUtilConstructor[]
		  }
		| {
				id?: string
				schema?: StoreSchema<TLRecord, TLStoreProps>
		  }
	)

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

/**
 * A helper for creating a TLStore.
 *
 * @param opts - Options for creating the store.
 *
 * @public */
export function createTLStore({
	initialData,
	defaultName = '',
	id,
	...rest
}: TLStoreOptions = {}): TLStore {
	const schema =
		'schema' in rest && rest.schema
			? // we have a schema
				rest.schema
			: // we need a schema
				createTLSchema({
					shapes:
						'shapeUtils' in rest && rest.shapeUtils
							? utilsToMap(checkShapesAndAddCore(rest.shapeUtils))
							: undefined,
					bindings:
						'bindingUtils' in rest && rest.bindingUtils
							? utilsToMap(checkBindings(rest.bindingUtils))
							: undefined,
					migrations: 'migrations' in rest ? rest.migrations : undefined,
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
