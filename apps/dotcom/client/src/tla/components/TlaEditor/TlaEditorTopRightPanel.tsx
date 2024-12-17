import { SignInButton } from '@clerk/clerk-react'
import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { PeopleMenu, usePassThroughWheelEvents } from 'tldraw'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
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
	context: 'file' | 'published-file' | 'scratch' | 'legacy'
}) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const fileId = useCurrentFileId()
	const trackEvent = useTldrawAppUiEvents()

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
					<TlaCtaButton
						data-testid="tla-sign-up"
						onClick={() => trackEvent('open-share-menu', { source: 'anon-landing-page' })}
					>
						<F defaultMessage="Sign in" />
					</TlaCtaButton>
				</SignInButton>
			</div>
		)
	}

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<PeopleMenu displayUserWhenAlone={false} />
			{context === 'legacy' && <LegacyImportButton />}
			<TlaFileShareMenu fileId={fileId!} source="file-header" context={context}>
				<TlaCtaButton
					data-testid="tla-share-button"
					onClick={() => trackEvent('open-share-menu', { source: 'top-bar' })}
				>
					<F defaultMessage="Share" />
				</TlaCtaButton>
			</TlaFileShareMenu>
		</div>
	)
}

function LegacyImportButton() {
	const roomId = useParams<{ roomId: string }>().roomId
	const handleClick = useCallback(() => {
		// todo: slurp the room id and navigate to the new file
		alert(roomId)
	}, [roomId])

	return (
		<TlaCtaButton data-testid="tla-import-button" onClick={handleClick}>
			<F defaultMessage="Copy to my files" />
		</TlaCtaButton>
	)
}
