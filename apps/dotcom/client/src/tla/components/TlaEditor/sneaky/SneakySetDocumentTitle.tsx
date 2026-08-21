import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useMaybeApp } from '../../../hooks/useAppState'
import { useMsg } from '../../../utils/i18n'
import { editorMessages as messages } from '../editor-messages'

export function SneakySetDocumentTitle() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const app = useMaybeApp()
	const editor = useGlobalEditor()
	const untitledProject = useMsg(messages.untitledProject)
	const title = useValue(
		'title',
		() =>
			// `||` not `??`: getFileName returns '' for a file the app doesn't know yet (first visit to
			// a shared link), which must fall through to the document name like the top-left panel does.
			(fileSlug ? app?.getFileName(fileSlug, false)?.trim() : null) ||
			editor?.getDocumentSettings().name ||
			// rather than displaying the date for the project here, display Untitled project
			untitledProject,
		[app, editor, fileSlug, untitledProject]
	)
	if (!title) return null
	return <Helmet title={app ? title : `${title} • tldraw`} />
}
