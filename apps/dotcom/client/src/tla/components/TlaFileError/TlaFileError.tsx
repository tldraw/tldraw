import { SignInButton } from '@clerk/clerk-react'
import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { ReactElement, useEffect } from 'react'
import { TldrawUiButton, useDialogs } from 'tldraw'
import { sadFaceIcon } from '../../../components/ErrorPage/ErrorPage'
import { useSetIsReady } from '../../hooks/useIsReady'
import { F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { SubmitFeedbackDialog } from '../dialogs/SubmitFeedbackDialog'
import styles from './TlaFileError.module.css'

function DefaultError() {
	const dialogs = useDialogs()
	return (
		<TlaFileErrorContent
			header={<F defaultMessage="Something went wrong" />}
			para1={<F defaultMessage="Please try refreshing the page." />}
			para2={
				<F
					defaultMessage="Still having trouble? <a>Report a problem</a>"
					values={{
						a: (chunks) => (
							<TldrawUiButton
								onClick={() => dialogs.addDialog({ component: SubmitFeedbackDialog })}
								type={'primary'}
								style={{ display: 'inline' }}
							>
								{chunks}
							</TldrawUiButton>
						),
					}}
				/>
			}
		/>
	)
}

export function TlaFileError({ error }: { error: unknown }) {
	const setIsReady = useSetIsReady()
	useEffect(() => {
		setIsReady()
	}, [setIsReady])

	if (!(error instanceof TLRemoteSyncError)) return <DefaultError />

	switch (error.reason) {
		case TLSyncErrorCloseEventReason.NOT_FOUND: {
			return (
				<TlaFileErrorContent
					header={<F defaultMessage="Not found" />}
					para1={<F defaultMessage="The file you are looking for does not exist." />}
				/>
			)
		}
		case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED: {
			return (
				<TlaFileErrorContent
					header={<F defaultMessage="Sign in" />}
					para1={<F defaultMessage="You need to sign in to view this file." />}
					cta={
						<SignInButton
							mode="modal"
							forceRedirectUrl={location.pathname + location.search}
							signUpForceRedirectUrl={location.pathname + location.search}
						>
							<TlaCtaButton data-testid="tla-sign-up">
								<F defaultMessage="Sign in" />
							</TlaCtaButton>
						</SignInButton>
					}
				/>
			)
		}
		case TLSyncErrorCloseEventReason.FORBIDDEN: {
			return (
				<TlaFileErrorContent
					header={<F defaultMessage="Invite only" />}
					para1={<F defaultMessage="Contact the owner to request access." />}
				/>
			)
		}
		case TLSyncErrorCloseEventReason.RATE_LIMITED: {
			return (
				<TlaFileErrorContent
					header={<F defaultMessage="Rate limited" />}
					para1={<F defaultMessage="Please slow down." />}
				/>
			)
		}
		case TLSyncErrorCloseEventReason.ROOM_FULL: {
			return (
				<TlaFileErrorContent
					header={<F defaultMessage="Collaborator limit reached" />}
					para1={
						<F defaultMessage="This file has reached the maximum number of active collaborators." />
					}
				/>
			)
		}
		case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD: {
			return (
				<TlaFileErrorContent
					header={<F defaultMessage="Please reload" />}
					para1={
						<F defaultMessage="A new version of tldraw is available. Please reload the page to continue." />
					}
				/>
			)
		}

		default:
			return <DefaultError />
	}
}

function TlaFileErrorContent({
	header,
	para1,
	para2,
	cta,
}: {
	header: ReactElement
	para1: ReactElement
	para2?: ReactElement
	cta?: ReactElement
}) {
	return (
		<div className={styles.container}>
			{sadFaceIcon}
			<div className={styles.content}>
				<h1>{header}</h1>
				<p>{para1}</p>
				{para2 ? <p>{para2}</p> : null}
			</div>
			{cta}
		</div>
	)
}
