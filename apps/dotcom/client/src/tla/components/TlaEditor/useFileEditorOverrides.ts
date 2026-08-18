import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Editor,
	TLDRAW_FILE_EXTENSION,
	TLUiOverrides,
	downloadFile,
	serializeTldrawJsonBlob,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useHandleUiEvents } from '../../../utils/analytics'
import { TldrawApp } from '../../app/TldrawApp'
import { useMaybeApp } from '../../hooks/useAppState'
import { useIntl, useMsg } from '../../utils/i18n'
import { editorMessages as messages } from './editor-messages'

/** Triggers a GET to the app file download endpoint; browser shows download immediately with progress. */
export function downloadAppFile(fileId: string) {
	const url = `/api/app/file/${fileId}/download`
	const a = document.createElement('a')
	a.href = url
	// meaningful file name is set by Content-Disposition header
	a.download = ''
	a.click()
}

export async function downloadFileFromEditor(editor: Editor, name: string) {
	const blobToSave = await serializeTldrawJsonBlob(editor)
	const file = new File([blobToSave], name, { type: 'application/json' })
	downloadFile(file)
}

/** The app file record's name when there is one, else the document's, else the untitled fallback
 *  (rather than the date the sidebar would show). */
export function getEditorFileName(
	app: TldrawApp | null,
	fileSlug: string | undefined,
	editor: Editor | null,
	untitled: string
) {
	return (
		((fileSlug ? app?.getFileName(fileSlug, false) : null) ?? editor?.getDocumentSettings().name) ||
		untitled
	)
}

export function useFileEditorOverrides({ fileSlug }: { fileSlug?: string }) {
	const app = useMaybeApp()
	const untitledProject = useMsg(messages.untitledProject)
	const intl = useIntl()
	const navigate = useNavigate()
	const trackEvent = useHandleUiEvents()

	const getFileName = useCallback(
		(editor: Editor) => getEditorFileName(app, fileSlug, editor, untitledProject),
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
						if (app && fileSlug) {
							downloadAppFile(fileSlug)
						} else {
							const defaultName = getFileName(editor) + TLDRAW_FILE_EXTENSION
							await downloadFileFromEditor(editor, defaultName)
						}
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
							const { fileId } = res.value
							navigate(routes.tlaFile(fileId))
							trackEvent('create-file', { source: 'legacy-import-button' })
						}
					},
				}

				return actions
			},
		}
	}, [app, fileSlug, getFileName, intl, navigate, trackEvent])

	return overrides
}
