import { Signal, computed } from '@tldraw/state'
import { UnknownRecord } from '@tldraw/store'
import {
	CameraRecordType,
	InstancePageStateRecordType,
	TLINSTANCE_ID,
	TLPageId,
	TLShapeId,
	TLStore,
	pageIdValidator,
	pluckPreservingValues,
	shapeIdValidator,
} from '@tldraw/tlschema'
import {
	deleteFromSessionStorage,
	getFromSessionStorage,
	isEqual,
	setInSessionStorage,
	structuredClone,
	uniqueId,
} from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { tlenv } from '../globals/environment'

const tabIdKey = 'TLDRAW_TAB_ID_v2' as const

const window = globalThis.window as
	| {
			navigator: Window['navigator']
			addEventListener: Window['addEventListener']
			TLDRAW_TAB_ID_v2?: string
	  }
	| undefined

// https://stackoverflow.com/a/9039885
function iOS() {
	if (!window) return false
	return (
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			window.navigator.platform
		) ||
		// iPad on iOS 13 detection
		(tlenv.isDarwin && 'ontouchend' in document)
	)
}

/**
 * A string that is unique per browser tab
 * @public
 */
export const TAB_ID: string = window
	? (window[tabIdKey] ??
		getFromSessionStorage(tabIdKey) ??
		`TLDRAW_INSTANCE_STATE_V1_` + uniqueId())
	: '<error>'
if (window) {
	window[tabIdKey] = TAB_ID
	if (iOS()) {
		// iOS does not trigger beforeunload
		// so we need to keep the sessionStorage value around
		// and hope the user doesn't figure out a way to duplicate their tab
		// in which case they'll have two tabs with the same UI state.
		// It's not a big deal, but it's not ideal.
		// And anyway I can't see a way to duplicate a tab in iOS Safari.
		setInSessionStorage(tabIdKey, TAB_ID)
	} else {
		deleteFromSessionStorage(tabIdKey)
	}
}

window?.addEventListener('beforeunload', () => {
	setInSessionStorage(tabIdKey, TAB_ID)
})

const Versions = {
	Initial: 0,
} as const

const CURRENT_SESSION_STATE_SNAPSHOT_VERSION = Math.max(...Object.values(Versions))

function migrate(snapshot: any) {
	if (snapshot.version < Versions.Initial) {
		// initial version
		// noop
	}
	// add further migrations down here. see TLUserPreferences.ts for an example.

	// finally
	snapshot.version = CURRENT_SESSION_STATE_SNAPSHOT_VERSION
}

/**
 * The state of the editor instance, not including any document state.
 *
 * @public
 */
export interface TLSessionStateSnapshot {
	version: number
	currentPageId?: TLPageId
	isFocusMode?: boolean
	exportBackground?: boolean
	isDebugMode?: boolean
	isToolLocked?: boolean
	isGridMode?: boolean
	pageStates?: Array<{
		pageId: TLPageId
		camera?: { x: number; y: number; z: number }
		selectedShapeIds?: TLShapeId[]
		focusedGroupId?: TLShapeId | null
	}>
}

const sessionStateSnapshotValidator: T.Validator<TLSessionStateSnapshot> = T.object({
	version: T.number,
	currentPageId: pageIdValidator.optional(),
	isFocusMode: T.boolean.optional(),
	exportBackground: T.boolean.optional(),
	isDebugMode: T.boolean.optional(),
	isToolLocked: T.boolean.optional(),
	isGridMode: T.boolean.optional(),
	pageStates: T.arrayOf(
		T.object({
			pageId: pageIdValidator,
			camera: T.object({
				x: T.number,
				y: T.number,
				z: T.number,
			}).optional(),
			selectedShapeIds: T.arrayOf(shapeIdValidator).optional(),
			focusedGroupId: shapeIdValidator.nullable().optional(),
		})
	).optional(),
})

function migrateAndValidateSessionStateSnapshot(state: unknown): TLSessionStateSnapshot | null {
	if (!state || typeof state !== 'object') {
		console.warn('Invalid instance state')
		return null
	}
	if (!('version' in state) || typeof state.version !== 'number') {
		console.warn('No version in instance state')
		return null
	}
	if (state.version !== CURRENT_SESSION_STATE_SNAPSHOT_VERSION) {
		state = structuredClone(state)
		migrate(state)
	}

	try {
		return sessionStateSnapshotValidator.validate(state)
	} catch (e) {
		console.warn(e)
		return null
	}
}

/**
 * Creates a signal of the instance state for a given store.
 * @public
 * @param store - The store to create the instance state snapshot signal for
 * @returns
 */
export function createSessionStateSnapshotSignal(
	store: TLStore
): Signal<TLSessionStateSnapshot | null> {
	const $allPageIds = store.query.ids('page')

	return computed<TLSessionStateSnapshot | null>(
		'sessionStateSnapshot',
		() => {
			const instanceState = store.get(TLINSTANCE_ID)
			if (!instanceState) return null

			const allPageIds = [...$allPageIds.get()]
			return {
				version: CURRENT_SESSION_STATE_SNAPSHOT_VERSION,
				currentPageId: instanceState.currentPageId,
				exportBackground: instanceState.exportBackground,
				isFocusMode: instanceState.isFocusMode,
				isDebugMode: instanceState.isDebugMode,
				isToolLocked: instanceState.isToolLocked,
				isGridMode: instanceState.isGridMode,
				pageStates: allPageIds.map((id) => {
					const ps = store.get(InstancePageStateRecordType.createId(id))
					const camera = store.get(CameraRecordType.createId(id))
					return {
						pageId: id,
						camera: {
							x: camera?.x ?? 0,
							y: camera?.y ?? 0,
							z: camera?.z ?? 1,
						},
						selectedShapeIds: ps?.selectedShapeIds ?? [],
						focusedGroupId: ps?.focusedGroupId ?? null,
					} satisfies NonNullable<TLSessionStateSnapshot['pageStates']>[0]
				}),
			} satisfies TLSessionStateSnapshot
		},
		{ isEqual }
	)
}

/**
 * Options for {@link loadSessionStateSnapshotIntoStore}
 * @public
 */
export interface TLLoadSessionStateSnapshotOptions {
	/**
	 * By default, some session state flags like `isDebugMode` are not overwritten when loading a snapshot.
	 * These are usually considered "sticky" by users while the document data is not.
	 * If you want to overwrite these flags, set this to `true`.
	 */
	forceOverwrite?: boolean
}

/**
 * Loads a snapshot of the editor's instance state into the store of a new editor instance.
 *
 * @public
 * @param store - The store to load the instance state into
 * @param snapshot - The instance state snapshot to load
 * @returns
 */
export function loadSessionStateSnapshotIntoStore(
	store: TLStore,
	snapshot: TLSessionStateSnapshot,
	opts?: TLLoadSessionStateSnapshotOptions
) {
	const res = migrateAndValidateSessionStateSnapshot(snapshot)
	if (!res) return

	const preserved = pluckPreservingValues(store.get(TLINSTANCE_ID))
	const primary = opts?.forceOverwrite ? res : preserved
	const secondary = opts?.forceOverwrite ? preserved : res

	const instanceState = store.schema.types.instance.create({
		id: TLINSTANCE_ID,
		...preserved,
		// the integrity checker will ensure that the currentPageId is valid
		currentPageId: res.currentPageId,
		isDebugMode: primary?.isDebugMode ?? secondary?.isDebugMode,
		isFocusMode: primary?.isFocusMode ?? secondary?.isFocusMode,
		isToolLocked: primary?.isToolLocked ?? secondary?.isToolLocked,
		isGridMode: primary?.isGridMode ?? secondary?.isGridMode,
		exportBackground: primary?.exportBackground ?? secondary?.exportBackground,
	})

	store.atomic(() => {
		for (const ps of res.pageStates ?? []) {
			if (!store.has(ps.pageId)) continue
			const cameraId = CameraRecordType.createId(ps.pageId)
			const instancePageState = InstancePageStateRecordType.createId(ps.pageId)
			const previousCamera = store.get(cameraId)
			const previousInstanceState = store.get(instancePageState)
			store.put([
				CameraRecordType.create({
					id: cameraId,
					x: ps.camera?.x ?? previousCamera?.x,
					y: ps.camera?.y ?? previousCamera?.y,
					z: ps.camera?.z ?? previousCamera?.z,
				}),
				InstancePageStateRecordType.create({
					id: instancePageState,
					pageId: ps.pageId,
					selectedShapeIds: ps.selectedShapeIds ?? previousInstanceState?.selectedShapeIds,
					focusedGroupId: ps.focusedGroupId ?? previousInstanceState?.focusedGroupId,
				}),
			])
		}

		store.put([instanceState])
		store.ensureStoreIsUsable()
	})
}

/**
 * @internal
 */
export function extractSessionStateFromLegacySnapshot(
	store: Record<string, UnknownRecord>
): TLSessionStateSnapshot | null {
	const instanceRecords = []
	for (const record of Object.values(store)) {
		if (record.typeName?.match(/^(instance.*|pointer|camera)$/)) {
			instanceRecords.push(record)
		}
	}

	// for scratch documents, we need to extract the most recently-used instance and it's associated page states
	// but oops we don't have the concept of "most recently-used" so we'll just take the first one
	const oldInstance = instanceRecords.filter(
		(r) => r.typeName === 'instance' && r.id !== TLINSTANCE_ID
	)[0] as any
	if (!oldInstance) return null

	const result: TLSessionStateSnapshot = {
		version: CURRENT_SESSION_STATE_SNAPSHOT_VERSION,
		currentPageId: oldInstance.currentPageId,
		exportBackground: !!oldInstance.exportBackground,
		isFocusMode: !!oldInstance.isFocusMode,
		isDebugMode: !!oldInstance.isDebugMode,
		isToolLocked: !!oldInstance.isToolLocked,
		isGridMode: false,
		pageStates: instanceRecords
			.filter((r: any) => r.typeName === 'instance_page_state' && r.instanceId === oldInstance.id)
			.map((ps: any) => {
				const camera = (store[ps.cameraId] as any) ?? { x: 0, y: 0, z: 1 }
				return {
					pageId: ps.pageId,
					camera: {
						x: camera.x,
						y: camera.y,
						z: camera.z,
					},
					selectedShapeIds: ps.selectedShapeIds,
					focusedGroupId: ps.focusedGroupId,
				} satisfies NonNullable<TLSessionStateSnapshot['pageStates']>[0]
			}),
	}

	try {
		sessionStateSnapshotValidator.validate(result)
		return result
	} catch {
		return null
	}
}
