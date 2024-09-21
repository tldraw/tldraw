import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaEditor } from '../components-tla/TlaEditor'
import { TlaWrapperWithSidebar } from '../components-tla/TlaWrapperWithSidebar'
import { useApp } from '../hooks/useAppState'

export function Component() {
	const app = useApp()
	const file = useValue(
		'most recent file',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app.getUserOwnFiles(auth.userId, auth.workspaceId)[0]
		},
		[app]
	)

	if (!file) throw Error('File not found')

	return (
		<TlaWrapperWithSidebar>
			<div className="tla-content">
				<TlaEditor file={file} />
			</div>
		</TlaWrapperWithSidebar>
	)
}
