import { Helmet } from 'react-helmet-async'
import { useTranslation, useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { editorMessages as messages } from '../editor-messages'

export function SneakyLegacySetDocumentTitle() {
	const msg = useTranslation()
	const editor = useGlobalEditor()
	const untitledProject = msg(messages.untitledProject)
	const title = useValue('title', () => editor?.getDocumentSettings().name || untitledProject, [
		editor,
		untitledProject,
	])
	return <Helmet title={`${title} • tldraw`} />
}
