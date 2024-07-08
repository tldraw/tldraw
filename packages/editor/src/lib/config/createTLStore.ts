import { HistoryEntry, MigrationSequence, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import {
	SchemaPropsInfo,
	TLAssetStore,
	TLRecord,
	TLStore,
	TLStoreProps,
	createTLSchema,
} from '@tldraw/tlschema'
import { FileHelpers, assert } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { TLAnyBindingUtilConstructor, checkBindings } from './defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'

/** @public */
export interface TLStoreBaseOptions {
	/** The initial data for the store. */
	initialData?: SerializedStore<TLRecord>

	/** The default name for the store. */
	defaultName?: string

	/** How should this store upload & resolve assets? */
	assets?: Partial<TLAssetStore>

	/** Called when the store is connected to an {@link Editor}. */
	onConnectEditor?: (editor: Editor) => void
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

/** @public */
export const defaultAssetStore: TLAssetStore = {
	upload: (_, file) => FileHelpers.blobToDataUrl(file),
	resolve: (asset) => asset.props.src,
}

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
	assets,
	onConnectEditor,
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
			assets: {
				...defaultAssetStore,
				...assets,
			},
			onConnectEditor: (editor) => {
				assert(editor instanceof Editor)
				onConnectEditor?.(editor)
			},
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
