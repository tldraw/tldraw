import classNames from 'classnames'
import { useDialogs } from 'tldraw'
import { defineMessages, useMsg } from '../../../utils/i18n'
import { SubmitFeedbackDialog } from '../../dialogs/SubmitFeedbackDialog'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

const messages = defineMessages({
	submitFeedback: { defaultMessage: 'Send feedback' },
})

export function TlaSidebarFeedbackButton() {
	const { addDialog } = useDialogs()
	const lbl = useMsg(messages.submitFeedback)
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
