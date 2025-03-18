import { Helmet } from 'react-helmet-async'
import { useValue } from 'tldraw'
import { useGlobalEditor } from '../../../../utils/globalEditor'
import { useMsg } from '../../../utils/i18n'
import { editorMessages as messages } from '../editor-messages'

export function SneakyLegacySetDocumentTitle() {
	const editor = useGlobalEditor()
	const untitledProject = useMsg(messages.untitledProject)
	const title = useValue('title', () => editor?.getDocumentSettings().name || untitledProject, [
		editor,
		untitledProject,
	])
	return <Helmet title={`${title} • tldraw`} />
}
