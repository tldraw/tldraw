import {
	CreateRoomRequestBody,
	CreateSnapshotRequestBody,
	CreateSnapshotResponseBody,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
	Snapshot,
} from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
	AssetRecordType,
	Editor,
	TLAsset,
	TLAssetId,
	TLRecord,
	TLShape,
	TLShapeId,
	TLUiEventHandler,
	TLUiOverrides,
	TLUiToastsContextType,
	TLUiTranslationKey,
	fetch,
	isShape,
} from 'tldraw'
import { writeToClipboard } from './clipboard'
import { cloneAssetForShare } from './cloneAssetForShare'
import { getParentOrigin, isInIframe } from './iFrame'
import { shouldLeaveSharedProject } from './shouldLeaveSharedProject'
import { trackAnalyticsEvent } from './trackAnalyticsEvent'
import { UI_OVERRIDE_TODO_EVENT, useHandleUiEvents } from './useHandleUiEvent'

export const SHARE_PROJECT_ACTION = 'share-project' as const
export const SHARE_SNAPSHOT_ACTION = 'share-snapshot' as const
export const LEAVE_SHARED_PROJECT_ACTION = 'leave-shared-project' as const
export const FORK_PROJECT_ACTION = 'fork-project' as const

const CREATE_SNAPSHOT_ENDPOINT = `/api/snapshots`
const SNAPSHOT_UPLOAD_URL = `/api/new-room`

async function getSnapshotLink(
	source: string,
	editor: Editor,
	handleUiEvent: TLUiEventHandler,
	addToast: TLUiToastsContextType['addToast'],
	msg: (id: TLUiTranslationKey) => string,
	parentSlug: string | undefined
) {
	handleUiEvent('share-snapshot' as UI_OVERRIDE_TODO_EVENT, { source } as UI_OVERRIDE_TODO_EVENT)
	const data = await getRoomData(editor, addToast, msg)
	if (!data) return ''

	const res = await fetch(CREATE_SNAPSHOT_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			snapshot: data,
			schema: editor.store.schema.serialize(),
			parent_slug: parentSlug,
		} satisfies CreateSnapshotRequestBody),
	})
	const response = (await res.json()) as CreateSnapshotResponseBody

	if (!res.ok || response.error) {
		console.error(await res.text())
		return ''
	}

	const url = editor.createDeepLink({
		url: `${window.location.origin}/${SNAPSHOT_PREFIX}/${response.roomId}`,
	})
	return new Blob([url.toString()], { type: 'text/plain' })
}

export async function getNewRoomResponse(snapshot: Snapshot) {
	return await fetch(SNAPSHOT_UPLOAD_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			origin: getParentOrigin(),
			snapshot,
		} satisfies CreateRoomRequestBody),
	})
}

export function useSharing(): TLUiOverrides {
	const navigate = useNavigate()
	const params = useParams()
	const roomId = params.roomId
	const handleUiEvent = useHandleUiEvents()
	const runningInIFrame = isInIframe()

	return useMemo(
		(): TLUiOverrides => ({
			actions(editor, actions, { addToast, clearToasts, msg, addDialog }) {
				actions[LEAVE_SHARED_PROJECT_ACTION] = {
					id: LEAVE_SHARED_PROJECT_ACTION,
					label: 'action.leave-shared-project',
					readonlyOk: true,
					onSelect: async () => {
						const shouldLeave = await shouldLeaveSharedProject(addDialog)
						if (!shouldLeave) return

						handleUiEvent('leave-shared-project', {})

						navigate('/')
					},
				}
				actions[SHARE_PROJECT_ACTION] = {
					id: SHARE_PROJECT_ACTION,
					label: 'action.share-project',
					readonlyOk: true,
					onSelect: async (source) => {
						try {
							addToast({
								title: msg('share-menu.creating-project'),
								severity: 'info',
								keepOpen: true,
							})

							handleUiEvent('share-project', { source })
							const data = await getRoomData(editor, addToast, msg)
							if (!data) return

							const res = await getNewRoomResponse({
								schema: editor.store.schema.serialize(),
								snapshot: data,
							})
							const response = (await res.json()) as { error: boolean; slug?: string }
							if (!res.ok || response.error) {
								console.error(await res.text())
								throw new Error('Failed to upload snapshot')
							}

							const url = editor.createDeepLink({
								url: `${window.location.origin}/${ROOM_PREFIX}/${response.slug}`,
							})

							clearToasts()
							if (runningInIFrame) {
								window.open(url)
							} else {
								// React router has an issue with the search params being encoded, which can cause multiple navigations
								// and can also make us believe that the URL has changed when it hasn't.
								// https://github.com/tldraw/tldraw/pull/3663#discussion_r1584946080
								navigate(decodeURIComponent(`${url.pathname}${url.search}`), {
									state: { shouldOpenShareMenu: true },
								})
							}
						} catch (error) {
							console.error(error)
							addToast({
								title: 'Error',
								description: msg('share-menu.upload-failed'),
								severity: 'error',
							})
						}
					},
				}
				actions[SHARE_SNAPSHOT_ACTION] = {
					id: SHARE_SNAPSHOT_ACTION,
					label: 'share-menu.create-snapshot-link',
					readonlyOk: true,
					onSelect: async (source) => {
						const result = await getSnapshotLink(
							source,
							editor,
							handleUiEvent,
							addToast,
							msg,
							roomId
						)
						writeToClipboard(new Promise((resolve) => resolve(result)))
						addToast({
							title: msg('share-menu.copied'),
							severity: 'success',
						})
					},
				}
				actions[FORK_PROJECT_ACTION] = {
					...actions[SHARE_PROJECT_ACTION],
					id: FORK_PROJECT_ACTION,
					label: runningInIFrame ? 'action.fork-project-on-tldraw' : 'action.fork-project',
				}
				return actions
			},
		}),
		[handleUiEvent, navigate, roomId, runningInIFrame]
	)
}

async function getRoomData(
	editor: Editor,
	addToast: TLUiToastsContextType['addToast'],
	msg: (id: TLUiTranslationKey) => string
) {
	const data = await getSnapshotData(editor)
	const size = new Blob([JSON.stringify(data)]).size

	if (size > 3999999) {
		addToast({
			title: 'Too big!',
			description: msg('share-menu.project-too-large'),
			severity: 'warning',
		})

		trackAnalyticsEvent('shared-fail-too-big', {
			size: size.toString(),
		})

		return null
	}
	return data
}

export async function getSnapshotData(editor: Editor) {
	const rawData = editor.store.serialize()

	// rawData contains a cache of previously added assets,
	// which we don't want included in the shared document.
	// So let's strip it out.

	// our final object that holds the data that we'll persist to a stash
	const data: Record<string, TLRecord> = {}

	// let's get all the assets/shapes in data
	const shapes = new Map<TLShapeId, TLShape>()
	const assets = new Map<TLAssetId, TLAsset>()

	for (const record of Object.values(rawData)) {
		if (AssetRecordType.isInstance(record)) {
			// collect assets separately, don't add them to the proper doc yet
			assets.set(record.id, record)
			continue
		}
		data[record.id] = record
		if (isShape(record)) {
			shapes.set(record.id, record)
		}
	}

	// now add only those assets that are referenced in shapes
	for (const shape of shapes.values()) {
		if ('assetId' in shape.props) {
			const asset = assets.get(shape.props.assetId as TLAssetId)
			// if we can't find the asset it either means
			// somethings gone wrong or we've already
			// processed it
			if (!asset) continue

			data[asset.id] = await cloneAssetForShare(editor, asset)
			// remove the asset after processing so we don't clone it multiple times
			assets.delete(asset.id)
		}
	}
	return data
}
