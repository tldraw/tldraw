import { useValue } from 'tldraw'
import { TlaPageControls } from '../components/TlaPageControls'
import { TlaSpacer } from '../components/TlaSpacer'
import { TlaWrapperWithSidebar } from '../components/TlaWrapperWithSidebar'
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
		<TlaWrapperWithSidebar>
			<div className="tla-content tla-page">
				<div className="tla-page__header">
					<h2 className="tla-text_ui__big">Groups</h2>
				</div>
				<TlaSpacer height={40} />
				<TlaPageControls viewName="shared" />
				<TlaSpacer height="20" />
			</div>
		</TlaWrapperWithSidebar>
	)
}
