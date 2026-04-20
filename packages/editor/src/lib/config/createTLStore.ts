import { Signal, computed } from '@tldraw/state'
import { HistoryEntry, MigrationSequence, SerializedStore, Store, StoreSchema } from '@tldraw/store'
import {
	CustomRecordInfo,
	SchemaPropsInfo,
	TLAssetStore,
	TLRecord,
	TLStore,
	TLStoreProps,
	TLStoreSnapshot,
	TLThemes,
	TLUser,
	TLUserStore,
	UserRecordType,
	createCachedUserResolve,
	createTLSchema,
	createUserId,
	registerColorsFromThemes,
	registerFontsFromThemes,
} from '@tldraw/tlschema'
import { FileHelpers, assert } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { resolveThemes } from '../editor/managers/ThemeManager/ThemeManager'
import { TLAnyAssetUtilConstructor, checkAssets } from './defaultAssets'
import { TLAnyBindingUtilConstructor, checkBindings } from './defaultBindings'
import { TLAnyShapeUtilConstructor, checkShapesAndAddCore } from './defaultShapes'
import { TLEditorSnapshot, loadSnapshot } from './TLEditorSnapshot'
import { defaultUserPreferences, getUserPreferences } from './TLUserPreferences'

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

	/**
	 * Named theme definitions. When provided, custom color names are automatically
	 * registered before the store is constructed so persisted data with those
	 * colors passes validation on load.
	 */
	themes?: Partial<TLThemes>

	/** How should this store resolve users for attribution? */
	users?: TLUserStore

	/** Called when the store is connected to an {@link @tldraw/editor#Editor}. */
	onMount?(editor: Editor): void | (() => void)
}

/** @public */
export type TLStoreSchemaOptions =
	| {
			schema?: StoreSchema<TLRecord, TLStoreProps>
	  }
	| {
			shapeUtils?: readonly TLAnyShapeUtilConstructor[]
			bindingUtils?: readonly TLAnyBindingUtilConstructor[]
			assetUtils?: readonly TLAnyAssetUtilConstructor[]
			migrations?: readonly MigrationSequence[]
			records?: Record<string, CustomRecordInfo>
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

const _defaultCurrentUser: Signal<TLUser | null> = computed('defaultCurrentUser', () => {
	const prefs = getUserPreferences()
	if (!prefs.id) return null
	return UserRecordType.create({
		id: createUserId(prefs.id),
		name: prefs.name ?? '',
		color: prefs.color ?? defaultUserPreferences.color,
	})
})

/** @public */
export const defaultUserStore: TLUserStore = {
	currentUser: _defaultCurrentUser,
}

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
		assets:
			'assetUtils' in opts && opts.assetUtils
				? utilsToMap(checkAssets(opts.assetUtils))
				: undefined,
		records: 'records' in opts ? opts.records : undefined,
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
	users = defaultUserStore,
	onMount,
	collaboration,
	themes,
	...rest
}: TLStoreOptions = {}): TLStore {
	const resolvedThemes = resolveThemes(themes)
	registerColorsFromThemes(resolvedThemes)
	registerFontsFromThemes(resolvedThemes)
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
			users: {
				currentUser: users.currentUser,
				resolve:
					users.resolve ??
					createCachedUserResolve((userId) => {
						const current = users.currentUser.get()
						return current && current.id === createUserId(userId) ? current : null
					}),
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
