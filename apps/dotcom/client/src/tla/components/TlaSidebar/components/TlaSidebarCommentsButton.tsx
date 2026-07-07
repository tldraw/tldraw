import { useNavigate } from 'react-router-dom'
import { TldrawUiButton } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

/** Links to the app-level /comments view (all comments across accessible files). */
export function TlaSidebarCommentsButton() {
	const navigate = useNavigate()
	return (
		<TldrawUiButton
			type="icon"
			className={styles.sidebarCreateFileButton}
			onClick={() => navigate(routes.tlaComments())}
			data-testid="tla-comments-link"
			title="Comments"
		>
			<TlaIcon icon="comment" />
		</TldrawUiButton>
	)
}
