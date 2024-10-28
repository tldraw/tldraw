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
				header = 'Private file'
				para1 = 'Contact the file owner to request access.'
				para2 = 'Or sign in if you are the file owner.'
				cta = <TlaSignInButton />
				break
			}
			case TLSyncErrorCloseEventReason.FORBIDDEN: {
				header = 'Private file'
				para1 = 'Contact the file owner to request access.'
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
