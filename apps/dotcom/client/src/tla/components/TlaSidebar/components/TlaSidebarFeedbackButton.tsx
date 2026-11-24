import classNames from 'classnames'
import { defineMessages, TldrawUiButton, useDialogs, useTranslation } from 'tldraw'
import { SubmitFeedbackDialog } from '../../dialogs/SubmitFeedbackDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	submitFeedback: { defaultMessage: 'Send feedback' },
})

export function TlaSidebarFeedbackButton() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	return (
		<TldrawUiButton
			type="icon"
			className={classNames(styles.sidebarCreateFileButton, styles.sidebarFeedbackButton)}
			data-testid="tla-sidebar-feedback-button"
			title={msg(messages.submitFeedback)}
			onClick={() => {
				addDialog({ component: SubmitFeedbackDialog })
			}}
		>
			<TlaIcon icon="feedback" />
		</TldrawUiButton>
	)
}
