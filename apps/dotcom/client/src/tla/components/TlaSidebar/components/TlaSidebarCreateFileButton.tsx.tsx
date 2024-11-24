import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { useMsg } from '../../../utils/i18n'
import { getFilePath } from '../../../utils/urls'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarCreateFileButton() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const createTitle = useMsg(messages.create)

	const handleSidebarCreate = useCallback(async () => {
		const res = await app.createFile()
		if (res.ok) {
			const { file } = res.value
			navigate(getFilePath(file.id), { state: { mode: 'create' } })
			trackEvent('create-file', { source: 'sidebar' })
		}
	}, [app, navigate, trackEvent])

	return (
		<button
			className={styles.create}
			onClick={handleSidebarCreate}
			data-testid="tla-create-file"
			title={createTitle}
		>
			<TlaIcon icon="edit-strong" />
		</button>
	)
}
