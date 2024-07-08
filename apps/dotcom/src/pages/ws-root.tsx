import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaEditor } from '../components-tla/TlaEditor'
import { useApp } from '../hooks/useAppState'

export function Component() {
	const app = useApp()
	const file = useValue(
		'most recent file',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app.getUserFiles(auth.userId, auth.workspaceId)[0]
		},
		[app]
	)
	if (!file) throw Error('File not found')

	return (
		<div className="tla_content">
			<TlaEditor file={file} />
		</div>
	)
}
