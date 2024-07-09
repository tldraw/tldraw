import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaButton } from '../components-tla/TlaButton'
import { TlaFileList } from '../components-tla/TlaFileList'
import { TlaPageControls } from '../components-tla/TlaPageControls'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { TlaWrapperWithSidebar } from '../components-tla/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'

const VIEW_NAME = 'drafts'

export function Component() {
	const app = useApp()

	const files = useValue(
		'starred files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			const files = app.getUserFiles(auth.userId, auth.workspaceId)
			return app.getSortedFilteredFiles(VIEW_NAME, files)
		},
		[app]
	)

	if (!files) throw Error('Files not found')

	return (
		<TlaWrapperWithSidebar>
			<div className="tla_content tla_page">
				<div className="tla_page__header">
					<h2 className="tla_text_ui__big">Drafts</h2>
					<TlaButton className="tla_page__create-button" iconRight="edit-strong">
						New
					</TlaButton>
				</div>
				<TlaSpacer height={40} />
				<TlaPageControls viewName={VIEW_NAME} />
				<TlaSpacer height="20" />
				<TlaFileList files={files} viewName={VIEW_NAME} />
			</div>
		</TlaWrapperWithSidebar>
	)
}
