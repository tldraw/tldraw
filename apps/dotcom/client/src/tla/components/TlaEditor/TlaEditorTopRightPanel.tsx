import classNames from 'classnames'
import { useRef } from 'react'
import { PeopleMenu, usePassThroughWheelEvents } from 'tldraw'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaShareButton } from '../TlaShareButton/TlaShareButton'
import { TlaSignUpButton } from './TlaSignUpButton'
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
