import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaButton } from '../components/TlaButton'
import { TlaFileList } from '../components/TlaFileList'
import { TlaListControls } from '../components/TlaListControls'
import { TlaSpacer } from '../components/TlaSpacer'
import { TlaWrapperWithSidebar } from '../components/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'
import { getFileUrl } from '../utils/urls'

const VIEW_NAME = 'drafts'

export function Component() {
	const app = useApp()
	const navigate = useNavigate()
	const files = useValue(
		'user files',
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
				<TlaListControls viewName={VIEW_NAME} />
				<TlaSpacer height="20" />
				<TlaFileList files={files} viewName={VIEW_NAME} />
			</div>
		</TlaWrapperWithSidebar>
	)
}
