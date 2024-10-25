import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { ReactElement, useEffect } from 'react'
import { sadFaceIcon } from '../../../components/ErrorPage/ErrorPage'
import { notFound } from '../../../pages/not-found'
import { useSetIsReady } from '../../hooks/useIsReady'
import { TlaNotFoundError } from '../../utils/notFoundError'
import { TlaSignInButton } from '../TlaSignInButton/TlaSignInButton'
import styles from './TlaFileError.module.css'

export function TlaFileError({ error }: { error: unknown }) {
	const setIsReady = useSetIsReady()
	useEffect(() => {
		setIsReady()
	}, [setIsReady])
	let header = 'Something went wrong'
	let para1 =
		'Please try refreshing the page. Still having trouble? Let us know at hello@tldraw.com.'
	let para2 = ''
	let cta = null as ReactElement | null
	if (error instanceof TLRemoteSyncError) {
		switch (error.reason) {
			case TLSyncErrorCloseEventReason.NOT_FOUND: {
				header = 'Not found'
				para1 = 'The file you are looking for does not exist.'
				break
			}
			case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED: {
				header = 'Invite only'
				para1 = 'You do not have permission to view this file.'
				para2 = 'You might need to sign in, or ask the file owner for access.'
				cta = <TlaSignInButton />
				break
			}
			case TLSyncErrorCloseEventReason.FORBIDDEN: {
				header = 'Invite only'
				para1 = 'You do not have permission to view this file.'
				para2 = 'You might need to contact the file owner to request access.'
				break
			}
		}
	}
	if (error instanceof TlaNotFoundError) {
		return notFound()
	}

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
