import classNames from 'classnames'
import { defineMessages, useDialogs, useTranslation } from 'tldraw'
import { SubmitFeedbackDialog } from '../../dialogs/SubmitFeedbackDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	submitFeedback: { defaultMessage: 'Send feedback' },
})

export function TlaSidebarFeedbackButton() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const lbl = msg(messages.submitFeedback.id)
	return (
		<button
			className={classNames(styles.sidebarLinkButton, styles.hoverable, 'tla-text_ui__regular')}
			data-testid="tla-sidebar-feedback-button"
			onClick={() => {
				addDialog({ component: SubmitFeedbackDialog })
			}}
		>
			<TlaIcon icon="feedback" />
			<span className={styles.sidebarLinkButtonLabel}>{lbl}</span>
		</button>
	)
}
