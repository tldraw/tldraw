import { useValue } from 'tldraw'
import { TlaFileList } from '../components/TlaFileList'
import { TlaListControls } from '../components/TlaListControls'
import { TlaSpacer } from '../components/TlaSpacer'
import { TlaWrapperWithSidebar } from '../components/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'

const VIEW_NAME = 'shared'

export function Component() {
	const app = useApp()
	const files = useValue(
		'starred files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return
			const files = app.getUserSharedFiles(auth.userId, auth.workspaceId)
			return app.getSortedFilteredFiles(VIEW_NAME, files)
		},
		[app]
	)
	if (!files) throw Error('Files not found')

	return (
		<TlaWrapperWithSidebar>
			<div className="tla-content tla-page">
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Shared with me</h2>
				</div>
				<TlaSpacer height={40} />
				<TlaListControls viewName={VIEW_NAME} />
				<TlaSpacer height="20" />
				<TlaFileList files={files} viewName={VIEW_NAME} />
			</div>
		</TlaWrapperWithSidebar>
	)
}
