import classNames from 'classnames'
import { defineMessages, F, useIntl } from '../../utils/i18n'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './close.module.css'

const messages = defineMessages({
	close: { defaultMessage: 'Close' },
})

export function TlaCloseButton({ onClose }: { onClose(): void }) {
	const intl = useIntl()
	const closeLbl = intl.formatMessage(messages.close)

	return (
		<button
			className={classNames(styles.button, 'tla-text_ui__regular')}
			onClick={onClose}
			title={closeLbl}
		>
			<TlaIcon icon="close-strong" />
			<span>
				<F defaultMessage="Close" />
			</span>
		</button>
	)
}
