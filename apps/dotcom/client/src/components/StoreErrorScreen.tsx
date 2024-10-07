import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { ErrorPage } from './ErrorPage/ErrorPage'

export function StoreErrorScreen({ error }: { error: Error }) {
	let header = 'Could not connect to server.'
	let message = ''
	if (error instanceof TLRemoteSyncError) {
		switch (error.reason) {
			case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD: {
				return (
					<ErrorPage
						icon={
							<img
								width={36}
								height={36}
								src="/tldraw-white-on-black.svg"
								loading="lazy"
								role="presentation"
							/>
						}
						messages={{
							header: 'Refresh the page',
							para1: 'You need to update to the latest version of tldraw to continue.',
						}}
						cta={<button onClick={() => window.location.reload()}>Refresh</button>}
					/>
				)
			}
			case TLSyncErrorCloseEventReason.SERVER_TOO_OLD: {
				message =
					'The multiplayer server is out of date. Please reload the page. If the problem persists contact the system administrator.'
				break
			}
			case TLSyncErrorCloseEventReason.INVALID_RECORD: {
				message =
					'Your changes were rejected by the server. Please reload the page. If the problem persists contact the system administrator.'
				break
			}
			case TLSyncErrorCloseEventReason.NOT_FOUND: {
				header = 'Room not found'
				message = 'The room you are trying to connect to does not exist.'
				break
			}
			case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
			case TLSyncErrorCloseEventReason.FORBIDDEN: {
				header = 'Unauthorized'
				message = 'You need to be authorized to view this room.'
				break
			}
			default: {
				console.error('Unhandled sync error', error)
			}
		}
	}

	return <ErrorPage messages={{ header, para1: message }} />
}
