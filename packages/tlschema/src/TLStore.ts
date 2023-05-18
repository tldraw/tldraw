import { Store, StoreSchema, StoreSchemaOptions, StoreSnapshot } from '@tldraw/tlstore'
import { annotateError, structuredClone } from '@tldraw/utils'
import { TLRecord } from './TLRecord'
import { TLCamera } from './records/TLCamera'
import { TLDOCUMENT_ID, TLDocument } from './records/TLDocument'
import { TLInstance, TLInstanceId } from './records/TLInstance'
import { TLInstancePageState } from './records/TLInstancePageState'
import { TLPage } from './records/TLPage'
import { TLUser, TLUserId } from './records/TLUser'
import { TLUserDocument } from './records/TLUserDocument'
import { TLUserPresence } from './records/TLUserPresence'

function sortByIndex<T extends { index: string }>(a: T, b: T) {
	if (a.index < b.index) {
		return -1
	} else if (a.index > b.index) {
		return 1
	}
	return 0
}

/** @internal */
export const USER_COLORS = [
	'#FF802B',
	'#EC5E41',
	'#F2555A',
	'#F04F88',
	'#E34BA9',
	'#BD54C6',
	'#9D5BD2',
	'#7B66DC',
	'#02B1CC',
	'#11B3A3',
	'#39B178',
	'#55B467',
]

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
	userId: TLUserId
	instanceId: TLInstanceId
	documentId: typeof TLDOCUMENT_ID
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

function getRandomColor() {
	return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

function getDefaultPages() {
	return [TLPage.create({ name: 'Page 1', index: 'a1' })]
}

/** @internal */
export function createIntegrityChecker(store: TLStore): () => void {
	const $pages = store.query.records('page')
	const $userDocumentSettings = store.query.record('user_document', () => ({
		userId: { eq: store.props.userId },
	}))

	const $instanceState = store.query.record('instance', () => ({
		id: { eq: store.props.instanceId },
	}))

	const $user = store.query.record('user', () => ({ id: { eq: store.props.userId } }))

	const $userPresences = store.query.records('user_presence')
	const $instancePageStates = store.query.records('instance_page_state')

	const ensureStoreIsUsable = (): void => {
		const { userId, instanceId: tabId } = store.props
		// make sure we have exactly one document
		if (!store.has(TLDOCUMENT_ID)) {
			store.put([TLDocument.create({ id: TLDOCUMENT_ID })])
			return ensureStoreIsUsable()
		}

		// make sure we have document state for the current user
		const userDocumentSettings = $userDocumentSettings.value

		if (!userDocumentSettings) {
			store.put([TLUserDocument.create({ userId })])
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
				TLInstance.create({
					id: tabId,
					userId,
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

		// make sure we have a user state record for the current user
		if (!$user.value) {
			store.put([TLUser.create({ id: userId })])
			return ensureStoreIsUsable()
		}

		const userPresences = $userPresences.value.filter((r) => r.userId === userId)
		if (userPresences.length === 0) {
			store.put([TLUserPresence.create({ userId, color: getRandomColor() })])
			return ensureStoreIsUsable()
		} else if (userPresences.length > 1) {
			// make sure we don't duplicate user presences
			store.remove(userPresences.slice(1).map((r) => r.id))
		}

		// make sure each page has a instancePageState and camera
		for (const page of pages) {
			const instancePageStates = $instancePageStates.value.filter(
				(tps) => tps.pageId === page.id && tps.instanceId === tabId
			)
			if (instancePageStates.length > 1) {
				// make sure we only have one instancePageState per instance per page
				store.remove(instancePageStates.slice(1).map((ips) => ips.id))
			} else if (instancePageStates.length === 0) {
				const camera = TLCamera.create({})
				store.put([
					camera,
					TLInstancePageState.create({ pageId: page.id, instanceId: tabId, cameraId: camera.id }),
				])
				return ensureStoreIsUsable()
			}

			// make sure the camera exists
			const camera = store.get(instancePageStates[0].cameraId)
			if (!camera) {
				store.put([TLCamera.create({ id: instancePageStates[0].cameraId })])
				return ensureStoreIsUsable()
			}
		}
	}

	return ensureStoreIsUsable
}
