import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Editor,
	TLDRAW_FILE_EXTENSION,
	TLStore,
	TLUiOverrides,
	downloadFile,
	serializeTldrawJsonBlob,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { useIntl, useMsg } from '../../utils/i18n'
import { editorMessages as messages } from './editor-messages'

export async function download(editor: Editor, name: string) {
	const blobToSave = await serializeTldrawJsonBlob(editor)
	const file = new File([blobToSave], name, { type: 'application/json' })
	downloadFile(file)
}

export function useFileEditorOverrides({ fileSlug }: { fileSlug?: string }) {
	const app = useMaybeApp()
	const untitledProject = useMsg(messages.untitledProject)
	const intl = useIntl()
	const navigate = useNavigate()
	const trackEvent = useHandleUiEvents()

	const getFileName = useCallback(
		(editor: Editor) => {
			const documentName =
				((fileSlug ? app?.getFileName(fileSlug, false) : null) ??
					editor?.getDocumentSettings().name) ||
				// rather than displaying the date for the project here, display Untitled project
				untitledProject
			const defaultName = saveFileNames.get(editor.store) || documentName

			return defaultName
		},
		[app, fileSlug, untitledProject]
	)

	const overrides = useMemo<TLUiOverrides>(() => {
		return {
			translations: {
				en: {
					'people-menu.anonymous-user': intl.formatMessage(messages.anonymousUser),
				},
			},
			actions(editor, actions) {
				// Add a shortcut that does nothing but blocks the command+s shortcut
				actions['save-null'] = {
					id: 'save-null',
					label: 'action.save-copy',
					readonlyOk: true,
					kbd: 'cmd+s,ctrl+s',
					onSelect() {
						trackEvent('save-project-no-action', { source: 'kbd' })
					},
				}
				actions['save-file-copy'] = {
					id: 'save-file-copy',
					label: intl.formatMessage(messages.downloadFile),
					readonlyOk: true,
					async onSelect() {
						trackEvent('download-file', { source: '' })
						const defaultName = getFileName(editor) + TLDRAW_FILE_EXTENSION
						await download(editor, defaultName)
					},
				}

				actions['copy-to-my-files'] = {
					id: 'copy-to-my-files',
					label: intl.formatMessage(messages.copyToMyfiles),
					readonlyOk: true,
					async onSelect() {
						const defaultName = getFileName(editor)
						const res = await app?.createFile({
							name: defaultName,
							createSource: window.location.pathname.slice(1),
						})
						if (res?.ok) {
							const { file } = res.value
							navigate(routes.tlaFile(file.id))
							trackEvent('create-file', { source: 'legacy-import-button' })
						}
					},
				}

				return actions
			},
		}
	}, [app, getFileName, intl, navigate, trackEvent])

	return overrides
}

// A map of previously saved tldr file names, so we can suggest the same name next time
const saveFileNames = new WeakMap<TLStore, string>()
