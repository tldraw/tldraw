import { TLRemoteSyncError, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { IntlProvider } from 'react-intl'
import { TlaFileErrorContent } from '../tla/components/TlaFileError/TlaFileError'
import { F } from '../tla/utils/i18n'
import LoginRedirectPage from './LoginRedirectPage/LoginRedirectPage'

export function StoreErrorScreen({ error }: { error: Error }) {
	let header = 'Could not connect to server.'
	let message = ''

	if (error instanceof TLRemoteSyncError) {
		switch (error.reason) {
			case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD: {
				return (
					<IntlProvider defaultLocale="en" locale="en" messages={{}}>
						<div className="error-page">
							<TlaFileErrorContent>
								<h1>
									<F defaultMessage="Refresh the page" />
								</h1>
								<p>
									<F defaultMessage="You need to update to the latest version of tldraw to continue." />
								</p>
							</TlaFileErrorContent>
						</div>
					</IntlProvider>
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
			case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED: {
				return <LoginRedirectPage />
			}
			case TLSyncErrorCloseEventReason.FORBIDDEN: {
				header = 'Invite only'
				message = `You don't have permission to view this room.`
				break
			}
			case TLSyncErrorCloseEventReason.RATE_LIMITED: {
				header = 'Rate limited'
				message = `Please slow down.`
				break
			}
			case TLSyncErrorCloseEventReason.ROOM_FULL: {
				header = 'Room full'
				message = 'This room has reached the maximum number of active collaborators.'
				break
			}
			default: {
				console.error('Unhandled sync error', error)
			}
		}
	}

	return (
		<IntlProvider defaultLocale="en" locale="en" messages={{}}>
			<div className="error-page">
				<TlaFileErrorContent>
					<h1>
						<F defaultMessage={header} />
					</h1>
					<p>
						<F defaultMessage={message} />
					</p>
				</TlaFileErrorContent>
			</div>
		</IntlProvider>
	)
}
