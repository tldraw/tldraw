import { Store, StoreSchema, StoreSchemaOptions, StoreSnapshot } from '@tldraw/tlstore'
import { annotateError, structuredClone } from '@tldraw/utils'
import { TLRecord } from './TLRecord'
import { CameraRecordType } from './records/TLCamera'
import { DocumentRecordType, TLDOCUMENT_ID } from './records/TLDocument'
import { InstanceRecordType, TLInstanceId } from './records/TLInstance'
import { InstancePageStateRecordType } from './records/TLInstancePageState'
import { PageRecordType } from './records/TLPage'
import { PointerRecordType, TLPOINTER_ID } from './records/TLPointer'
import { UserDocumentRecordType } from './records/TLUserDocument'

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
export type TLStoreSnapshot = StoreSnapshot<TLRecord>

/** @public */
export type TLStoreProps = {
	instanceId: TLInstanceId
	documentId: typeof TLDOCUMENT_ID
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
	return [PageRecordType.create({ name: 'Page 1', index: 'a1' })]
}

/** @internal */
export function createIntegrityChecker(store: TLStore): () => void {
	const $pages = store.query.records('page')
	const $userDocumentSettings = store.query.record('user_document')

	const $instanceState = store.query.record('instance', () => ({
		id: { eq: store.props.instanceId },
	}))

	const $instancePageStates = store.query.records('instance_page_state')

	const ensureStoreIsUsable = (): void => {
		const { instanceId: tabId } = store.props
		// make sure we have exactly one document
		if (!store.has(TLDOCUMENT_ID)) {
			store.put([DocumentRecordType.create({ id: TLDOCUMENT_ID, name: store.props.defaultName })])
			return ensureStoreIsUsable()
		}

		if (!store.has(TLPOINTER_ID)) {
			store.put([PointerRecordType.create({ id: TLPOINTER_ID })])
			return ensureStoreIsUsable()
		}

		// make sure we have document state for the current user
		const userDocumentSettings = $userDocumentSettings.value

		if (!userDocumentSettings) {
			store.put([UserDocumentRecordType.create({})])
			return ensureStoreIsUsable()
		}

		// make sure there is at least one page
		const pages = $pages.value.sort(sortByIndex)
		if (pages.length === 0) {
			store.put(getDefaultPages())
			return ensureStoreIsUsable()
		}

		// make sure we have state for the current user's current tab
		const instanceState = $instanceState.value
		if (!instanceState) {
			// The tab props are either the the last used tab's props or undefined
			const propsForNextShape = userDocumentSettings.lastUsedTabId
				? store.get(userDocumentSettings.lastUsedTabId)?.propsForNextShape
				: undefined

			// The current page is either the last updated page or the first page
			const currentPageId = userDocumentSettings?.lastUpdatedPageId ?? pages[0].id!

			store.put([
				InstanceRecordType.create({
					id: tabId,
					currentPageId,
					propsForNextShape,
					exportBackground: true,
				}),
			])

			return ensureStoreIsUsable()
		}

		// make sure the user's currentPageId is still valid
		let currentPageId = instanceState.currentPageId
		if (!pages.find((p) => p.id === currentPageId)) {
			currentPageId = pages[0].id!
			store.put([{ ...instanceState, currentPageId }])
			return ensureStoreIsUsable()
		}

		for (const page of pages) {
			const instancePageStates = $instancePageStates.value.filter(
				(tps) => tps.pageId === page.id && tps.instanceId === tabId
			)
			if (instancePageStates.length > 1) {
				// make sure we only have one instancePageState per instance per page
				store.remove(instancePageStates.slice(1).map((ips) => ips.id))
			} else if (instancePageStates.length === 0) {
				const camera = CameraRecordType.create({})
				store.put([
					camera,
					InstancePageStateRecordType.create({
						pageId: page.id,
						instanceId: tabId,
						cameraId: camera.id,
					}),
				])
				return ensureStoreIsUsable()
			}

			// make sure the camera exists
			const camera = store.get(instancePageStates[0].cameraId)
			if (!camera) {
				store.put([CameraRecordType.create({ id: instancePageStates[0].cameraId })])
				return ensureStoreIsUsable()
			}
		}
	}

	return ensureStoreIsUsable
}
