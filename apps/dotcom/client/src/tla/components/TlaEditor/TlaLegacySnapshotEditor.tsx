import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { useCallback } from 'react'
import { Editor, TLComponents, TLStoreSnapshot, Tldraw, fetch } from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { useLegacyUrlParams } from '../../../hooks/useLegacyUrlParams'
import { assetUrls } from '../../../utils/assetUrls'
import { globalEditor } from '../../../utils/globalEditor'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { SneakyDarkModeSync } from './SneakyDarkModeSync'
import { TlaEditorWrapper } from './TlaEditorWrapper'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaEditorLegacySharePanel } from './editor-components/TlaEditorLegacySharePanel'
import { TlaEditorMenuPanel } from './editor-components/TlaEditorMenuPanel'
import { TlaEditorTopPanel } from './editor-components/TlaEditorTopPanel'
import { SneakyTldrawFileDropHandler } from './sneaky/SneakyFileDropHandler'
import { SneakyLegacySetDocumentTitle } from './sneaky/SneakyLegacytSetDocumentTitle'
import { SneakySetDocumentTitle } from './sneaky/SneakySetDocumentTitle'
import { useFileEditorOverrides } from './useFileEditorOverrides'

/** @internal */
export const components: TLComponents = {
	ErrorFallback: TlaEditorErrorFallback,
	MenuPanel: TlaEditorMenuPanel,
	SharePanel: TlaEditorLegacySharePanel,
	TopPanel: TlaEditorTopPanel,
}

export function TlaLegacySnapshotEditor({
	fileSlug,
	snapshot,
	timeStamp,
	context,
	token,
}: {
	fileSlug: string
	snapshot: TLStoreSnapshot
	context: 'legacy-snapshot' | 'legacy-history-snapshot'
	timeStamp?: string
	token?: string
}) {
	return (
		<>
			<SneakySetDocumentTitle />
			<ReadyWrapper key={fileSlug}>
				<TlaEditorInner
					fileSlug={fileSlug}
					snapshot={snapshot}
					timeStamp={timeStamp}
					token={token}
					context={context}
				/>
			</ReadyWrapper>
		</>
	)
}

function TlaEditorInner({
	fileSlug,
	snapshot,
	timeStamp,
	token,
	context,
}: {
	fileSlug: string
	snapshot: TLStoreSnapshot
	context: 'legacy-snapshot' | 'legacy-history-snapshot'
	timeStamp?: string
	token?: string
}) {
	const app = useMaybeApp()

	const setIsReady = useSetIsReady()

	// make sure this runs before the editor is instantiated
	useLegacyUrlParams()

	const handleUiEvent = useHandleUiEvents()

	const fileSystemUiOverrides = useFileEditorOverrides({})

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = editor
			;(window as any).editor = editor
			// Register the editor globally
			globalEditor.set(editor)
			editor.updateInstanceState({ isReadonly: true })
			setIsReady()
		},
		[setIsReady]
	)

	const restoreVersion = useCallback(async () => {
		const sure = window.confirm('Are you sure?')
		if (!sure) return

		const res = await fetch(`/api/${ROOM_PREFIX}/${fileSlug}/restore`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token
					? {
							Authorization: 'Bearer ' + token,
						}
					: {}),
			},
			body: JSON.stringify({ timeStamp }),
		})

		if (!res.ok) {
			window.alert('Something went wrong!')
			return
		}

		window.alert('done')
	}, [fileSlug, timeStamp, token])

	return (
		<TlaEditorWrapper>
			<Tldraw
				className="tla-editor"
				snapshot={snapshot}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[fileSystemUiOverrides]}
				initialState={'hand'}
				onUiEvent={handleUiEvent}
				components={components}
				deepLinks
				options={{ actionShortcutsLocation: 'toolbar' }}
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
				<SneakyLegacySetDocumentTitle />
				{app && <SneakyTldrawFileDropHandler />}
				{context === 'legacy-history-snapshot' && (
					<button
						style={{
							zIndex: 10000,
							position: 'absolute',
							top: 64,
							right: 6,
							pointerEvents: 'all',
						}}
						onClick={restoreVersion}
						// eslint-disable-next-line react/jsx-no-literals
					>
						Restore version
					</button>
				)}
			</Tldraw>
		</TlaEditorWrapper>
	)
}

// const restoreVersion = useCallback(async () => {
// 	const sure = window.confirm('Are you sure?')
// 	if (!sure) return

// 	const res = await fetch(`/api/${ROOM_PREFIX}/${roomId}/restore`, {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 			...(token
// 				? {
// 						Authorization: 'Bearer ' + token,
// 					}
// 				: {}),
// 		},
// 		body: JSON.stringify({ timeStamp }),
// 	})

// 	if (!res.ok) {
// 		window.alert('Something went wrong!')
// 		return
// 	}

// 	window.alert('done')
// }, [roomId, timeStamp, token])
