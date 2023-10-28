import { Signal, computed, transact } from '@tldraw/state'
import {
	RecordsDiff,
	UnknownRecord,
	defineMigrations,
	migrate,
	squashRecordDiffs,
} from '@tldraw/store'
import {
	CameraRecordType,
	InstancePageStateRecordType,
	TLINSTANCE_ID,
	TLPageId,
	TLRecord,
	TLShapeId,
	TLStore,
	pageIdValidator,
	shapeIdValidator,
} from '@tldraw/tlschema'
import { objectMapFromEntries } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { uniqueId } from '../utils/uniqueId'

const tabIdKey = 'TLDRAW_TAB_ID_v2' as const

const window = globalThis.window as
	| {
			navigator: Window['navigator']
			localStorage: Window['localStorage']
			sessionStorage: Window['sessionStorage']
			addEventListener: Window['addEventListener']
			TLDRAW_TAB_ID_v2?: string
	  }
	| undefined

// https://stackoverflow.com/a/9039885
function iOS() {
	if (!window) return false
	return (
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
			window.navigator.platform
		) ||
		// iPad on iOS 13 detection
		(window.navigator.userAgent.includes('Mac') && 'ontouchend' in document)
	)
}

/**
 * A string that is unique per browser tab
 * @public
 */
export const TAB_ID: string =
	window?.[tabIdKey] ?? window?.sessionStorage[tabIdKey] ?? `TLDRAW_INSTANCE_STATE_V1_` + uniqueId()
if (window) {
	window[tabIdKey] = TAB_ID
	if (iOS()) {
		// iOS does not trigger beforeunload
		// so we need to keep the sessionStorage value around
		// and hope the user doesn't figure out a way to duplicate their tab
		// in which case they'll have two tabs with the same UI state.
		// It's not a big deal, but it's not ideal.
		// And anyway I can't see a way to duplicate a tab in iOS Safari.
		window.sessionStorage[tabIdKey] = TAB_ID
	} else {
		delete window.sessionStorage[tabIdKey]
	}
}

window?.addEventListener('beforeunload', () => {
	window.sessionStorage[tabIdKey] = TAB_ID
})

const Versions = {
	Initial: 0,
} as const

export const CURRENT_SESSION_STATE_SNAPSHOT_VERSION = Versions.Initial

/**
 * The state of the editor instance, not including any document state.
 *
 * @public
 */
export interface TLSessionStateSnapshot {
	version: number
	currentPageId: TLPageId
	isFocusMode: boolean
	exportBackground: boolean
	isDebugMode: boolean
	isToolLocked: boolean
	isGridMode: boolean
	pageStates: Array<{
		pageId: TLPageId
		camera: { x: number; y: number; z: number }
		selectedShapeIds: TLShapeId[]
		focusedGroupId: TLShapeId | null
	}>
}

const sessionStateSnapshotValidator: T.Validator<TLSessionStateSnapshot> = T.object({
	version: T.number,
	currentPageId: pageIdValidator,
	isFocusMode: T.boolean,
	exportBackground: T.boolean,
	isDebugMode: T.boolean,
	isToolLocked: T.boolean,
	isGridMode: T.boolean,
	pageStates: T.arrayOf(
		T.object({
			pageId: pageIdValidator,
			camera: T.object({
				x: T.number,
				y: T.number,
				z: T.number,
			}),
			selectedShapeIds: T.arrayOf(shapeIdValidator),
			focusedGroupId: shapeIdValidator.nullable(),
		})
	),
})

const sessionStateSnapshotMigrations = defineMigrations({
	currentVersion: CURRENT_SESSION_STATE_SNAPSHOT_VERSION,
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
	const result = migrate<TLSessionStateSnapshot>({
		value: state,
		fromVersion: state.version,
		toVersion: CURRENT_SESSION_STATE_SNAPSHOT_VERSION,
		migrations: sessionStateSnapshotMigrations,
	})
	if (result.type === 'error') {
		console.warn(result.reason)
		return null
	}

	const value = { ...result.value, version: CURRENT_SESSION_STATE_SNAPSHOT_VERSION }

	try {
		sessionStateSnapshotValidator.validate(value)
	} catch (e) {
		console.warn(e)
		return null
	}

	return value
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

	return computed<TLSessionStateSnapshot | null>('sessionStateSnapshot', () => {
		const instanceState = store.get(TLINSTANCE_ID)
		if (!instanceState) return null

		const allPageIds = [...$allPageIds.value]
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
				} satisfies TLSessionStateSnapshot['pageStates'][0]
			}),
		} satisfies TLSessionStateSnapshot
	})
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
	snapshot: TLSessionStateSnapshot
) {
	const res = migrateAndValidateSessionStateSnapshot(snapshot)
	if (!res) return

	// remove all page states and cameras and the instance state
	const allPageStatesAndCameras = store
		.allRecords()
		.filter((r) => r.typeName === 'instance_page_state' || r.typeName === 'camera')

	const removeDiff: RecordsDiff<TLRecord> = {
		added: {},
		updated: {},
		removed: {
			...objectMapFromEntries(allPageStatesAndCameras.map((r) => [r.id, r])),
		},
	}
	if (store.has(TLINSTANCE_ID)) {
		removeDiff.removed[TLINSTANCE_ID] = store.get(TLINSTANCE_ID)!
	}

	const addDiff: RecordsDiff<TLRecord> = {
		removed: {},
		updated: {},
		added: {
			[TLINSTANCE_ID]: store.schema.types.instance.create({
				id: TLINSTANCE_ID,
				currentPageId: res.currentPageId,
				isDebugMode: res.isDebugMode,
				isFocusMode: res.isFocusMode,
				isToolLocked: res.isToolLocked,
				isGridMode: res.isGridMode,
				exportBackground: res.exportBackground,
			}),
		},
	}

	// replace them with new ones
	for (const ps of res.pageStates) {
		const cameraId = CameraRecordType.createId(ps.pageId)
		const pageStateId = InstancePageStateRecordType.createId(ps.pageId)
		addDiff.added[cameraId] = CameraRecordType.create({
			id: CameraRecordType.createId(ps.pageId),
			x: ps.camera.x,
			y: ps.camera.y,
			z: ps.camera.z,
		})
		addDiff.added[pageStateId] = InstancePageStateRecordType.create({
			id: InstancePageStateRecordType.createId(ps.pageId),
			pageId: ps.pageId,
			selectedShapeIds: ps.selectedShapeIds,
			focusedGroupId: ps.focusedGroupId,
		})
	}

	transact(() => {
		store.applyDiff(squashRecordDiffs([removeDiff, addDiff]))
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
			.map((ps: any): TLSessionStateSnapshot['pageStates'][0] => {
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
				}
			}),
	}

	try {
		sessionStateSnapshotValidator.validate(result)
		return result
	} catch (e) {
		return null
	}
}
