import classNames from 'classnames'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { defineMessages, useMsg } from '../../utils/i18n'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './signed-out-share-button.module.css'

export const messages = defineMessages({
	share: { defaultMessage: 'Share' },
})

export function TlaSignedOutShareButton({
	fileId,
	context,
}: {
	fileId?: string
	context: 'file' | 'published-file' | 'scratch' | 'legacy'
}) {
	const trackEvent = useTldrawAppUiEvents()
	const shareLbl = useMsg(messages.share)

	return (
		<TlaFileShareMenu fileId={fileId} context={context} source="anon">
			<button
				data-testid="tla-share-button"
				aria-label={shareLbl}
				className={classNames(styles.signedOutShareButton)}
				onClick={() => trackEvent('open-share-menu', { source: 'anon-top-bar' })}
			>
				<TlaIcon icon="share" />
			</button>
		</TlaFileShareMenu>
	)
}
