import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { ReactElement, useEffect } from 'react'
import { sadFaceIcon } from '../../../components/ErrorPage/ErrorPage'
import { F } from '../../app/i18n'
import { useSetIsReady } from '../../hooks/useIsReady'
import { TlaSignInButton } from '../TlaSignInButton/TlaSignInButton'
import styles from './TlaFileError.module.css'

function DefaultError() {
	return (
		<TlaFileErrorContent
			header={<F defaultMessage="Something went wrong" />}
			para1={<F defaultMessage="Please try refreshing the page." />}
			para2={<F defaultMessage="Still having trouble? Let us know at hello@tldraw.com" />}
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
					header={<F defaultMessage="Private file" />}
					para1={<F defaultMessage="Contact the owner to request access." />}
					cta={<TlaSignInButton />}
				/>
			)
		}
		case TLSyncErrorCloseEventReason.FORBIDDEN: {
			return (
				<TlaFileErrorContent
					header={<F defaultMessage="Private file" />}
					para1={<F defaultMessage="Contact the owner to request access." />}
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
