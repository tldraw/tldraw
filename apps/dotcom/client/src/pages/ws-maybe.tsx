import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/globals.css'
import { TlaEditor } from '../components-tla/TlaEditor'
import { TlaWrapperCollapsableSidebar } from '../components-tla/TlaWrapperCollapsableSidebar'
import { useApp } from '../hooks/useAppState'
import { getFileUrl } from '../utils/tla/urls'

export function Component() {
	const app = useApp()
	const navigate = useNavigate()

	const file = useMemo(() => {
		const session = app.getSessionState()
		if (!session.auth) throw Error('User not authenticated')
		return app.createFile(session.auth.userId, session.auth.workspaceId)
	}, [app])

	const handleChange = useCallback(() => {
		const session = app.getSessionState()
		if (!session.auth) throw Error('User not authenticated')
		navigate(getFileUrl(session.auth.workspaceId, file.id), { replace: true })
	}, [app, navigate, file.id])

	// todo: handle viewing permissions—is this file owned by the user, or is it part of a group that they belong to?

	return (
		<TlaWrapperCollapsableSidebar>
			<div className="tla-content">
				{file && <TlaEditor file={file} onDocumentChange={handleChange} />}
			</div>
		</TlaWrapperCollapsableSidebar>
	)
}
