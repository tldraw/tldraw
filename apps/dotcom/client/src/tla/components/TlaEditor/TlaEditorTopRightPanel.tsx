import { SignInButton } from '@clerk/clerk-react'
import classNames from 'classnames'
import { useRef } from 'react'
import { PeopleMenu, usePassThroughWheelEvents } from 'tldraw'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaSignedOutShareButton } from '../TlaSignedOutShareButton/TlaSignedOutShareButton'
import styles from './top.module.css'

export function TlaEditorTopRightPanel({
	isAnonUser,
	context,
}: {
	isAnonUser: boolean
	context: 'file' | 'published-file' | 'scratch'
}) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref.current)
	const fileId = useCurrentFileId()

	if (isAnonUser) {
		return (
			<div ref={ref} className={classNames(styles.topRightPanel)}>
				<PeopleMenu displayUserWhenAlone={false} />
				<TlaSignedOutShareButton fileId={fileId} context={context} />
				<SignInButton
					mode="modal"
					forceRedirectUrl={location.pathname + location.search}
					signUpForceRedirectUrl={location.pathname + location.search}
				>
					<TlaCtaButton data-testid="tla-sign-up">
						<F defaultMessage="Sign in" />
					</TlaCtaButton>
				</SignInButton>
			</div>
		)
	}

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<PeopleMenu displayUserWhenAlone={false} />
			<TlaFileShareMenu fileId={fileId!} source="file-header" context={context}>
				<TlaCtaButton data-testid="tla-share-button">
					<F defaultMessage="Share" />
				</TlaCtaButton>
			</TlaFileShareMenu>
		</div>
	)
}
