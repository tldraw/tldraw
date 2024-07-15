import { Signal } from '@tldraw/state'
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
	onEditorMount?: (editor: Editor) => void | (() => void)

	/** Is this store connected to a multiplayer sync server? */
	multiplayerStatus?: Signal<'online' | 'offline'> | null
}

/** @public */
export type TLStoreSchemaOptions =
	| {
			schema?: StoreSchema<TLRecord, TLStoreProps>
	  }
	| {
			shapeUtils?: readonly TLAnyShapeUtilConstructor[]
			migrations?: readonly MigrationSequence[]
			bindingUtils?: readonly TLAnyBindingUtilConstructor[]
	  }

/** @public */
export type TLStoreOptions = TLStoreBaseOptions & { id?: string } & TLStoreSchemaOptions

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

/** @public */
export const defaultAssetStore: TLAssetStore = {
	upload: (_, file) => FileHelpers.blobToDataUrl(file),
	resolve: (asset) => asset.props.src,
}

/**
 * A helper for creating a TLStore schema.
 *
 * @param opts - Options for creating the schema.
 *
 * @public
 */
export function createTLStoreSchema(
	opts: TLStoreSchemaOptions
): StoreSchema<TLRecord, TLStoreProps> {
	if ('schema' in opts && opts.schema) {
		return opts.schema
	} else {
		return createTLSchema({
			shapes:
				'shapeUtils' in opts && opts.shapeUtils
					? utilsToMap(checkShapesAndAddCore(opts.shapeUtils))
					: undefined,
			bindings:
				'bindingUtils' in opts && opts.bindingUtils
					? utilsToMap(checkBindings(opts.bindingUtils))
					: undefined,
			migrations: 'migrations' in opts ? opts.migrations : undefined,
		})
	}
}

/**
 * A helper for creating a TLStore.
 *
 * @param opts - Options for creating the store.
 *
 * @public
 */
export function createTLStore({
	initialData,
	defaultName = '',
	id,
	assets,
	onEditorMount,
	multiplayerStatus,
	...rest
}: TLStoreOptions = {}): TLStore {
	const schema = createTLStoreSchema(rest)

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
			onEditorMount: (editor) => {
				assert(editor instanceof Editor)
				onEditorMount?.(editor)
			},
			multiplayerStatus: multiplayerStatus ?? null,
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
