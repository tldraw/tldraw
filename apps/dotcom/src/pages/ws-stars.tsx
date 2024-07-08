import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaFileList } from '../components-tla/TlaFileList'
import { TlaPageControls } from '../components-tla/TlaPageControls'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { TlaWrapperWithSidebar } from '../components-tla/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'

export function Component() {
	const app = useApp()
	const files = useValue(
		'starred files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			const files = app.getUserStarredFiles(auth.userId, auth.workspaceId)
			return app.getSortedFilteredFiles('star', files)
		},
		[app]
	)
	if (!files) throw Error('Files not found')

	return (
		<TlaWrapperWithSidebar>
			<div className="tla_content tla_page">
				<div className="tla_page__header">
					<h2 className="tla_text_ui__big">Starred</h2>
				</div>
				<TlaSpacer height={40} />
				<TlaPageControls viewName="stars" />
				<TlaSpacer height="20" />
				<TlaFileList files={files} viewName="star" />
			</div>
		</TlaWrapperWithSidebar>
	)
}
