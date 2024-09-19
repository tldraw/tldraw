import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaPageControls } from '../components-tla/TlaPageControls'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { TlaWrapperCollapsableSidebar } from '../components-tla/TlaWrapperCollapsableSidebar'
import { useApp } from '../hooks/useAppState'

export function Component() {
	const app = useApp()
	const groups = useValue(
		'groups',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return
			const groups = app.getUserGroups(auth.userId, auth.workspaceId)
			// todo: sort, filter
			return groups
		},
		[app]
	)
	if (!groups) throw Error('Files not found')

	return (
		<TlaWrapperCollapsableSidebar>
			<div className="tla-content tla-page">
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Groups</h2>
				</div>
				<TlaSpacer height={40} />
				<TlaPageControls viewName="shared" />
				<TlaSpacer height="20" />
			</div>
		</TlaWrapperCollapsableSidebar>
	)
}
