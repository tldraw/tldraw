import classNames from 'classnames'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './signed-out-share-button.module.css'

export function TlaSignedOutShareButton({
	fileId,
	context,
}: {
	fileId?: string
	context: 'file' | 'published-file' | 'scratch'
}) {
	return (
		<TlaFileShareMenu fileId={fileId} context={context} source="anon">
			<button data-testid="share-button" className={classNames(styles.signedOutShareButton)}>
				<TlaIcon icon="share" />
			</button>
		</TlaFileShareMenu>
	)
}
