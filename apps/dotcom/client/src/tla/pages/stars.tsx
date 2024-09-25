import { useValue } from 'tldraw'
import { TlaFileList } from '../components/TlaFileList'
import { TlaPageControls } from '../components/TlaPageControls'
import { TlaSpacer } from '../components/TlaSpacer'
import { TlaWrapperWithSidebar } from '../components/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'

const VIEW_NAME = 'star'

export function Component() {
	const app = useApp()
	const files = useValue(
		'starred files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			const files = app.getUserStarredFiles(auth.userId, auth.workspaceId)
			return app.getSortedFilteredFiles(VIEW_NAME, files)
		},
		[app]
	)
	if (!files) throw Error('Files not found')

	return (
		<TlaWrapperWithSidebar>
			<div className="tla-content tla-page">
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Starred</h2>
				</div>
				<TlaSpacer height={40} />
				<TlaPageControls viewName={VIEW_NAME} />
				<TlaSpacer height="20" />
				<TlaFileList files={files} viewName={VIEW_NAME} />
			</div>
		</TlaWrapperWithSidebar>
	)
}
