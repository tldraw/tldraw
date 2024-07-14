import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaButton } from '../components-tla/TlaButton'
import { TlaFileList } from '../components-tla/TlaFileList'
import { TlaPageControls } from '../components-tla/TlaPageControls'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { TlaWrapperWithSidebar } from '../components-tla/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'
import { getFileUrl } from '../utils/tla/urls'

const VIEW_NAME = 'drafts'

export function Component() {
	const app = useApp()
	const navigate = useNavigate()
	const files = useValue(
		'starred files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			const files = app.getUserOwnFiles(auth.userId, auth.workspaceId)
			return app.getSortedFilteredFiles(VIEW_NAME, files)
		},
		[app]
	)

	if (!files) throw Error('Files not found')

	return (
		<TlaWrapperWithSidebar>
			<div className="tla-content tla-page">
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Drafts</h2>
					<TlaButton
						className="tla-page__create-button"
						iconRight="edit-strong"
						onClick={() => {
							const session = app.getSessionState()
							if (!session.auth) return
							const file = app.createFile(session.auth.userId, session.auth.workspaceId)
							navigate(getFileUrl(session.auth.workspaceId, file.id))
						}}
					>
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
