import {
	SerializedStore,
	Store,
	StoreSchema,
	StoreSchemaOptions,
	StoreSnapshot,
} from '@tldraw/store'
import { IndexKey, annotateError, structuredClone } from '@tldraw/utils'
import { CameraRecordType, TLCameraId } from './records/TLCamera'
import { DocumentRecordType, TLDOCUMENT_ID } from './records/TLDocument'
import { TLINSTANCE_ID } from './records/TLInstance'
import { PageRecordType, TLPageId } from './records/TLPage'
import { InstancePageStateRecordType, TLInstancePageStateId } from './records/TLPageState'
import { PointerRecordType, TLPOINTER_ID } from './records/TLPointer'
import { TLRecord } from './records/TLRecord'

function sortByIndex<T extends { index: string }>(a: T, b: T) {
	if (a.index < b.index) {
		return -1
	} else if (a.index > b.index) {
		return 1
	}
	return 0
}

function redactRecordForErrorReporting(record: any) {
	if (record.typeName === 'asset') {
		if ('src' in record) {
			record.src = '<redacted>'
		}

		if ('src' in record.props) {
			record.props.src = '<redacted>'
		}
	}
}

/** @public */
export type TLStoreSchema = StoreSchema<TLRecord, TLStoreProps>

/** @public */
export type TLSerializedStore = SerializedStore<TLRecord>

/** @public */
export type TLStoreSnapshot = StoreSnapshot<TLRecord>

/** @public */
export interface TLStoreProps {
	defaultName: string
}

/** @public */
export type TLStore = Store<TLRecord, TLStoreProps>

/** @public */
export const onValidationFailure: StoreSchemaOptions<
	TLRecord,
	TLStoreProps
>['onValidationFailure'] = ({ error, phase, record, recordBefore }): TLRecord => {
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

/** @internal */
export function createIntegrityChecker(store: TLStore): () => void {
	const $pageIds = store.query.ids('page')

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
			if (!store.has(pageStateId)) {
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
	}

	return ensureStoreIsUsable
}
