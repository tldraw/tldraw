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
			if (!auth) return
			const files = app.getUserSharedFiles(auth.userId, auth.workspaceId)
			return app.getSortedFilteredFiles('shared', files)
		},
		[app]
	)
	if (!files) throw Error('Files not found')

	return (
		<TlaWrapperWithSidebar>
			<div className="tla_content tla_page">
				<div className="tla_page__header">
					<h2 className="tla_text_ui__big">Shared with me</h2>
				</div>
				<TlaSpacer height={40} />
				<TlaPageControls viewName="shared" />
				<TlaSpacer height="20" />
				<TlaFileList files={files} viewName="shared" />
			</div>
		</TlaWrapperWithSidebar>
	)
}
