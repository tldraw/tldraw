import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useMaybeApp } from '../../../hooks/useAppState'
import { useMsg } from '../../../utils/i18n'
import { editorMessages as messages } from '../editor-messages'
import { getEditorFileName } from '../useFileEditorOverrides'

export function SneakySetDocumentTitle() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const app = useMaybeApp()
	const editor = useGlobalEditor()
	const untitledProject = useMsg(messages.untitledProject)
	const title = useValue('title', () => getEditorFileName(app, fileSlug, editor, untitledProject), [
		app,
		editor,
		fileSlug,
		untitledProject,
	])
	return <Helmet title={app ? title : `${title} • tldraw`} />
}
