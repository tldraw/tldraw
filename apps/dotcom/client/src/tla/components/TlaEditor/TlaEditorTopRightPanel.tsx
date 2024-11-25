import classNames from 'classnames'
import { useRef } from 'react'
import { PeopleMenu, usePassThroughWheelEvents } from 'tldraw'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { TlaShareButton } from '../TlaShareButton/TlaShareButton'
import { TlaSignUpButton } from '../TlaSignUpButton/TlaSignUpButton'
import styles from './top.module.css'

export function TlaEditorTopRightPanel({ isAnonUser }: { isAnonUser: boolean }) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const fileId = useCurrentFileId()

	if (isAnonUser) {
		return (
			<div ref={ref} className={classNames(styles.topRightPanel)}>
				<PeopleMenu displayUserWhenAlone={false} />
				<div className={styles.signInButtons}>
					<TlaFileShareMenu fileId={fileId!} isPublished source="anon">
						<button className={classNames(styles.shareButtonMini)}>
							<TlaIcon icon="share" />
						</button>
					</TlaFileShareMenu>
					<TlaSignUpButton />
				</div>
			</div>
		)
	}

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<PeopleMenu displayUserWhenAlone={false} />
			<TlaFileShareMenu fileId={fileId!} source="file-header">
				<TlaShareButton />
			</TlaFileShareMenu>
		</div>
	)
}
