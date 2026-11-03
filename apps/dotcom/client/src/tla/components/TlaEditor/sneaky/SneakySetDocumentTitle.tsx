import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useTranslation, useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useMaybeApp } from '../../../hooks/useAppState'
import { editorMessages as messages } from '../editor-messages'
import { getEditorFileName } from '../useFileEditorOverrides'

export function SneakySetDocumentTitle() {
	const msg = useTranslation()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const app = useMaybeApp()
	const editor = useGlobalEditor()
	const untitledProject = msg(messages.untitledProject)
	const title = useValue('title', () => getEditorFileName(app, fileSlug, editor, untitledProject), [
		app,
		editor,
		fileSlug,
		untitledProject,
	])
	if (!title) return null
	return <Helmet title={app ? title : `${title} • tldraw`} />
}
