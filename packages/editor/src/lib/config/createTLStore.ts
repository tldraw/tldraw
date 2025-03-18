import { Signal } from '@tldraw/state'
import { HistoryEntry, MigrationSequence, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import {
	SchemaPropsInfo,
	TLAssetStore,
	TLRecord,
	TLStore,
	TLStoreProps,
	TLStoreSnapshot,
	createTLSchema,
} from '@tldraw/tlschema'
import { FileHelpers, assert } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { TLEditorSnapshot, loadSnapshot } from './TLEditorSnapshot'
import { TLAnyBindingUtilConstructor, checkBindings } from './defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'

/** @public */
export interface TLStoreBaseOptions {
	/** The initial data for the store. */
	initialData?: SerializedStore<TLRecord>

	/** A snapshot of initial data to migrate and load into the store. */
	snapshot?: Partial<TLEditorSnapshot> | TLStoreSnapshot

	/** The default name for the store. */
	defaultName?: string

	/** How should this store upload & resolve assets? */
	assets?: TLAssetStore

	/** Called when the store is connected to an {@link Editor}. */
	onMount?(editor: Editor): void | (() => void)
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
export type TLStoreOptions = TLStoreBaseOptions & {
	id?: string
	/** Collaboration options for the store. */
	collaboration?: {
		status: Signal<'online' | 'offline'> | null
		mode?: Signal<'readonly' | 'readwrite'> | null
	}
} & TLStoreSchemaOptions

/** @public */
export type TLStoreEventInfo = HistoryEntry<TLRecord>

const defaultAssetResolve: NonNullable<TLAssetStore['resolve']> = (asset) => asset.props.src

/** @public */
export const inlineBase64AssetStore: TLAssetStore = {
	upload: async (_, file) => {
		return { src: await FileHelpers.blobToDataUrl(file) }
	},
}

/**
 * A helper for creating a TLStore schema from either an object with shapeUtils, bindingUtils, and
 * migrations, or a schema.
 *
 * @param opts - Options for creating the schema.
 *
 * @public
 */
export function createTLSchemaFromUtils(
	opts: TLStoreSchemaOptions
): StoreSchema<TLRecord, TLStoreProps> {
	if ('schema' in opts && opts.schema) return opts.schema

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
	assets = inlineBase64AssetStore,
	onMount,
	collaboration,
	...rest
}: TLStoreOptions = {}): TLStore {
	const schema = createTLSchemaFromUtils(rest)

	const store = new Store({
		id,
		schema,
		initialData,
		props: {
			defaultName,
			assets: {
				upload: assets.upload,
				resolve: assets.resolve ?? defaultAssetResolve,
				remove: assets.remove ?? (() => Promise.resolve()),
			},
			onMount: (editor) => {
				assert(editor instanceof Editor)
				onMount?.(editor)
			},
			collaboration,
		},
	})

	if (rest.snapshot) {
		if (initialData) throw new Error('Cannot provide both initialData and snapshot')
		loadSnapshot(store, rest.snapshot, { forceOverwriteSessionState: true })
	}

	return store
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
