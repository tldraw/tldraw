import classNames from 'classnames'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './signed-out-share-button.module.css'

export function TlaSignedOutShareButton({
	fileId,
	context,
}: {
	fileId?: string
	context: 'file' | 'published-file' | 'scratch' | 'legacy'
}) {
	const trackEvent = useTldrawAppUiEvents()
	return (
		<TlaFileShareMenu fileId={fileId} context={context} source="anon">
			<button
				data-testid="tla-share-button"
				className={classNames(styles.signedOutShareButton)}
				onClick={() => trackEvent('open-share-menu', { source: 'anon-top-bar' })}
			>
				<TlaIcon icon="share" />
			</button>
		</TlaFileShareMenu>
	)
}
