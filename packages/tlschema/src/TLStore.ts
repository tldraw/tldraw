import { Signal } from '@tldraw/state'
import {
	SerializedStore,
	Store,
	StoreSchema,
	StoreSnapshot,
	StoreValidationFailure,
} from '@tldraw/store'
import { IndexKey, JsonObject, annotateError, sortByIndex, structuredClone } from '@tldraw/utils'
import { TLAsset, TLAssetId } from './records/TLAsset'
import { CameraRecordType, TLCameraId } from './records/TLCamera'
import { DocumentRecordType, TLDOCUMENT_ID } from './records/TLDocument'
import { TLINSTANCE_ID } from './records/TLInstance'
import { PageRecordType, TLPageId } from './records/TLPage'
import { InstancePageStateRecordType, TLInstancePageStateId } from './records/TLPageState'
import { PointerRecordType, TLPOINTER_ID } from './records/TLPointer'
import { TLRecord } from './records/TLRecord'

/**
 * Redacts the source of an asset record for error reporting.
 *
 * @param record - The asset record to redact
 * @returns The redacted record
 * @internal
 */
export function redactRecordForErrorReporting(record: any) {
	if (record.typeName === 'asset') {
		if ('src' in record) {
			record.src = '<redacted>'
		}

		if ('src' in record.props) {
			record.props.src = '<redacted>'
		}
	}
}

/**
 * The complete schema type for a tldraw store, defining the structure and validation rules
 * for all tldraw records and store properties.
 *
 * @public
 * @example
 * ```ts
 * import { createTLSchema } from '@tldraw/tlschema'
 *
 * const schema = createTLSchema()
 * const storeSchema: TLStoreSchema = schema
 * ```
 */
export type TLStoreSchema = StoreSchema<TLRecord, TLStoreProps>

/**
 * A serialized representation of a tldraw store that can be persisted or transmitted.
 * Contains all store records in a JSON-serializable format.
 *
 * @public
 * @example
 * ```ts
 * // Serialize a store
 * const serializedStore: TLSerializedStore = store.serialize()
 *
 * // Save to localStorage
 * localStorage.setItem('drawing', JSON.stringify(serializedStore))
 * ```
 */
export type TLSerializedStore = SerializedStore<TLRecord>

/**
 * A snapshot of a tldraw store at a specific point in time, containing all records
 * and metadata. Used for persistence, synchronization, and creating store backups.
 *
 * @public
 * @example
 * ```ts
 * // Create a snapshot
 * const snapshot: TLStoreSnapshot = store.getSnapshot()
 *
 * // Restore from snapshot
 * store.loadSnapshot(snapshot)
 * ```
 */
export type TLStoreSnapshot = StoreSnapshot<TLRecord>

/**
 * Context information provided when resolving asset URLs, containing details about
 * the current rendering environment and user's connection to optimize asset delivery.
 *
 * @public
 * @example
 * ```ts
 * const assetStore: TLAssetStore = {
 *   async resolve(asset, context: TLAssetContext) {
 *     // Use low resolution for slow connections
 *     if (context.networkEffectiveType === 'slow-2g') {
 *       return `${asset.props.src}?quality=low`
 *     }
 *     // Use high DPI version for retina displays
 *     if (context.dpr > 1) {
 *       return `${asset.props.src}@2x`
 *     }
 *     return asset.props.src
 *   }
 * }
 * ```
 */
export interface TLAssetContext {
	/**
	 * The scale at which the asset is being rendered on-screen relative to its native dimensions.
	 * If the asset is 1000px wide, but it's been resized/zoom so it takes 500px on-screen, this
	 * will be 0.5.
	 *
	 * The scale measures CSS pixels, not device pixels.
	 */
	screenScale: number
	/** The {@link TLAssetContext.screenScale}, stepped to the nearest power-of-2 multiple. */
	steppedScreenScale: number
	/** The device pixel ratio - how many CSS pixels are in one device pixel? */
	dpr: number
	/**
	 * An alias for
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType | `navigator.connection.effectiveType` }
	 * if it's available in the current browser. Use this to e.g. serve lower-resolution images to
	 * users on slow connections.
	 */
	networkEffectiveType: string | null
	/**
	 * In some circumstances, we need to resolve a URL that points to the original version of a
	 * particular asset. This is used when the asset will leave the current tldraw instance - e.g.
	 * for copy/paste, or exports.
	 */
	shouldResolveToOriginal: boolean
}

/**
 * Interface for storing and managing assets (images, videos, etc.) in tldraw.
 * Provides methods for uploading, resolving, and removing assets from storage.
 *
 * A `TLAssetStore` sits alongside the main {@link TLStore} and is responsible for storing and
 * retrieving large assets such as images. Generally, this should be part of a wider sync system:
 *
 * - By default, the store is in-memory only, so `TLAssetStore` converts images to data URLs
 * - When using
 *   {@link @tldraw/editor#TldrawEditorWithoutStoreProps.persistenceKey | `persistenceKey`}, the
 *   store is synced to the browser's local IndexedDB, so `TLAssetStore` stores images there too
 * - When using a multiplayer sync server, you would implement `TLAssetStore` to upload images to
 *   e.g. an S3 bucket.
 *
 * @public
 * @example
 * ```ts
 * // Simple in-memory asset store
 * const assetStore: TLAssetStore = {
 *   async upload(asset, file) {
 *     const dataUrl = await fileToDataUrl(file)
 *     return { src: dataUrl }
 *   },
 *
 *   async resolve(asset, context) {
 *     return asset.props.src
 *   },
 *
 *   async remove(assetIds) {
 *     // Clean up if needed
 *   }
 * }
 * ```
 */
export interface TLAssetStore {
	/**
	 * Upload an asset to your storage, returning a URL that can be used to refer to the asset
	 * long-term.
	 *
	 * @param asset - Information & metadata about the asset being uploaded
	 * @param file - The `File` to be uploaded
	 * @returns A promise that resolves to the URL of the uploaded asset
	 */
	upload(
		asset: TLAsset,
		file: File,
		abortSignal?: AbortSignal
	): Promise<{ src: string; meta?: JsonObject }>
	/**
	 * Resolve an asset to a URL. This is used when rendering the asset in the editor. By default,
	 * this will just use `asset.props.src`, the URL returned by `upload()`. This can be used to
	 * rewrite that URL to add access credentials, or optimized the asset for how it's currently
	 * being displayed using the {@link TLAssetContext | information provided}.
	 *
	 * @param asset - the asset being resolved
	 * @param ctx - information about the current environment and where the asset is being used
	 * @returns The URL of the resolved asset, or `null` if the asset is not available
	 */
	resolve?(asset: TLAsset, ctx: TLAssetContext): Promise<string | null> | string | null
	/**
	 * Remove an asset from storage. This is called when the asset is no longer needed, e.g. when
	 * the user deletes it from the editor.
	 * @param asset - the asset being removed
	 * @returns A promise that resolves when the asset has been removed
	 */
	remove?(assetIds: TLAssetId[]): Promise<void>
}

/**
 * Configuration properties for a tldraw store, defining its behavior and integrations.
 * These props are passed when creating a new store instance.
 *
 * @public
 * @example
 * ```ts
 * const storeProps: TLStoreProps = {
 *   defaultName: 'My Drawing',
 *   assets: myAssetStore,
 *   onMount: (editor) => {
 *     console.log('Editor mounted')
 *     return () => console.log('Editor unmounted')
 *   },
 *   collaboration: {
 *     status: statusSignal,
 *     mode: modeSignal
 *   }
 * }
 *
 * const store = new Store({ schema, props: storeProps })
 * ```
 */
export interface TLStoreProps {
	/** Default name for new documents created in this store */
	defaultName: string
	/** Asset store implementation for handling file uploads and storage */
	assets: Required<TLAssetStore>
	/**
	 * Called when an {@link @tldraw/editor#Editor} connected to this store is mounted.
	 * Can optionally return a cleanup function that will be called when unmounted.
	 *
	 * @param editor - The editor instance that was mounted
	 * @returns Optional cleanup function
	 */
	onMount(editor: unknown): void | (() => void)
	/** Optional collaboration configuration for multiplayer features */
	collaboration?: {
		/** Signal indicating online/offline collaboration status */
		status: Signal<'online' | 'offline'> | null
		/** Signal indicating collaboration mode permissions */
		mode?: Signal<'readonly' | 'readwrite'> | null
	}
}

/**
 * The main tldraw store type, representing a reactive database of tldraw records
 * with associated store properties. This is the central data structure that holds
 * all shapes, assets, pages, and user state.
 *
 * @public
 * @example
 * ```ts
 * import { Store } from '@tldraw/store'
 * import { createTLSchema } from '@tldraw/tlschema'
 *
 * const schema = createTLSchema()
 * const store: TLStore = new Store({
 *   schema,
 *   props: {
 *     defaultName: 'Untitled',
 *     assets: myAssetStore,
 *     onMount: () => console.log('Store mounted')
 *   }
 * })
 * ```
 */
export type TLStore = Store<TLRecord, TLStoreProps>

/**
 * Default validation failure handler for tldraw stores. This function is called
 * when a record fails validation during store operations. It annotates errors
 * with debugging information and determines whether to allow invalid records
 * during store initialization.
 *
 * @param options - The validation failure details
 *   - error - The validation error that occurred
 *   - phase - The store operation phase when validation failed
 *   - record - The invalid record that caused the failure
 *   - recordBefore - The previous state of the record (if applicable)
 * @returns The record to use (typically throws the annotated error)
 * @throws The original validation error with additional debugging context
 *
 * @public
 * @example
 * ```ts
 * const store = new Store({
 *   schema,
 *   props: storeProps,
 *   onValidationFailure // Use this as the validation failure handler
 * })
 *
 * // The handler will be called automatically when validation fails
 * try {
 *   store.put([invalidRecord])
 * } catch (error) {
 *   // Error will contain debugging information added by onValidationFailure
 * }
 * ```
 */
export function onValidationFailure({
	error,
	phase,
	record,
	recordBefore,
}: StoreValidationFailure<TLRecord>): TLRecord {
	const isExistingValidationIssue =
		// if we're initializing the store for the first time, we should
		// allow invalid records so people can load old buggy data:
		phase === 'initialize'

	annotateError(error, {
		tags: {
			origin: 'store.validateRecord',
			storePhase: phase,
			isExistingValidationIssue,
		},
		extras: {
			recordBefore: recordBefore
				? redactRecordForErrorReporting(structuredClone(recordBefore))
				: undefined,
			recordAfter: redactRecordForErrorReporting(structuredClone(record)),
		},
	})

	throw error
}

function getDefaultPages() {
	return [
		PageRecordType.create({
			id: 'page:page' as TLPageId,
			name: 'Page 1',
			index: 'a1' as IndexKey,
			meta: {},
		}),
	]
}

/**
 * Creates an integrity checker function that ensures the tldraw store maintains
 * a consistent and usable state. The checker validates that required records exist
 * and relationships between records are maintained.
 *
 * The integrity checker ensures:
 * - Document and pointer records exist
 * - At least one page exists
 * - Instance state references valid pages
 * - Page states and cameras exist for all pages
 * - Shape references in page states are valid
 *
 * @param store - The tldraw store to check for integrity
 * @returns A function that when called, validates and fixes store integrity
 *
 * @internal
 * @example
 * ```ts
 * const checker = createIntegrityChecker(store)
 *
 * // Run integrity check (typically called automatically)
 * checker()
 *
 * // The checker will create missing records and fix invalid references
 * ```
 */
export function createIntegrityChecker(store: Store<TLRecord, TLStoreProps>): () => void {
	const $pageIds = store.query.ids('page')
	const $pageStates = store.query.records('instance_page_state')

	const ensureStoreIsUsable = (): void => {
		// make sure we have exactly one document
		if (!store.has(TLDOCUMENT_ID)) {
			store.put([DocumentRecordType.create({ id: TLDOCUMENT_ID, name: store.props.defaultName })])
			return ensureStoreIsUsable()
		}

		if (!store.has(TLPOINTER_ID)) {
			store.put([PointerRecordType.create({ id: TLPOINTER_ID })])
			return ensureStoreIsUsable()
		}

		// make sure there is at least one page
		const pageIds = $pageIds.get()
		if (pageIds.size === 0) {
			store.put(getDefaultPages())
			return ensureStoreIsUsable()
		}

		const getFirstPageId = () => [...pageIds].map((id) => store.get(id)!).sort(sortByIndex)[0].id!

		// make sure we have state for the current user's current tab
		const instanceState = store.get(TLINSTANCE_ID)
		if (!instanceState) {
			store.put([
				store.schema.types.instance.create({
					id: TLINSTANCE_ID,
					currentPageId: getFirstPageId(),
					exportBackground: true,
				}),
			])

			return ensureStoreIsUsable()
		} else if (!pageIds.has(instanceState.currentPageId)) {
			store.put([{ ...instanceState, currentPageId: getFirstPageId() }])
			return ensureStoreIsUsable()
		}

		// make sure we have page states and cameras for all the pages
		const missingPageStateIds = new Set<TLInstancePageStateId>()
		const missingCameraIds = new Set<TLCameraId>()
		for (const id of pageIds) {
			const pageStateId = InstancePageStateRecordType.createId(id)
			const pageState = store.get(pageStateId)
			if (!pageState) {
				missingPageStateIds.add(pageStateId)
			}
			const cameraId = CameraRecordType.createId(id)
			if (!store.has(cameraId)) {
				missingCameraIds.add(cameraId)
			}
		}

		if (missingPageStateIds.size > 0) {
			store.put(
				[...missingPageStateIds].map((id) =>
					InstancePageStateRecordType.create({
						id,
						pageId: InstancePageStateRecordType.parseId(id) as TLPageId,
					})
				)
			)
		}

		if (missingCameraIds.size > 0) {
			store.put([...missingCameraIds].map((id) => CameraRecordType.create({ id })))
		}

		const pageStates = $pageStates.get()
		for (const pageState of pageStates) {
			if (!pageIds.has(pageState.pageId)) {
				store.remove([pageState.id])
				continue
			}
			if (pageState.croppingShapeId && !store.has(pageState.croppingShapeId)) {
				store.put([{ ...pageState, croppingShapeId: null }])
				return ensureStoreIsUsable()
			}
			if (pageState.focusedGroupId && !store.has(pageState.focusedGroupId)) {
				store.put([{ ...pageState, focusedGroupId: null }])
				return ensureStoreIsUsable()
			}
			if (pageState.hoveredShapeId && !store.has(pageState.hoveredShapeId)) {
				store.put([{ ...pageState, hoveredShapeId: null }])
				return ensureStoreIsUsable()
			}
			const filteredSelectedIds = pageState.selectedShapeIds.filter((id) => store.has(id))
			if (filteredSelectedIds.length !== pageState.selectedShapeIds.length) {
				store.put([{ ...pageState, selectedShapeIds: filteredSelectedIds }])
				return ensureStoreIsUsable()
			}
			const filteredHintingIds = pageState.hintingShapeIds.filter((id) => store.has(id))
			if (filteredHintingIds.length !== pageState.hintingShapeIds.length) {
				store.put([{ ...pageState, hintingShapeIds: filteredHintingIds }])
				return ensureStoreIsUsable()
			}
			const filteredErasingIds = pageState.erasingShapeIds.filter((id) => store.has(id))
			if (filteredErasingIds.length !== pageState.erasingShapeIds.length) {
				store.put([{ ...pageState, erasingShapeIds: filteredErasingIds }])
				return ensureStoreIsUsable()
			}
		}
	}

	return ensureStoreIsUsable
}
