import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tltime } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { useMsg } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { messages } from './sidebar-shared'

export function TlaSidebarCreateFileButton() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const createTitle = useMsg(messages.create)

	const rCanCreate = useRef(true)

	const handleSidebarCreate = useCallback(async () => {
		if (!rCanCreate.current) return
		const res = app.createFile()
		if (res.ok) {
			const { file } = res.value
			navigate(routes.tlaFile(file.id), { state: { mode: 'create' } })
			trackEvent('create-file', { source: 'sidebar' })
			rCanCreate.current = false
			tltime.setTimeout('can create again', () => (rCanCreate.current = true), 1000)
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
