import { TLIncompatibilityReason } from '@tldraw/tlsync'
import { ErrorScreen, exhaustiveSwitchError } from 'tldraw'
import { RemoteSyncError } from '../utils/remote-sync/remote-sync'

export function StoreErrorScreen({ error }: { error: Error }) {
	let message = 'Could not connect to server.'

	if (error instanceof RemoteSyncError) {
		switch (error.reason) {
			case TLIncompatibilityReason.ClientTooOld: {
				message = 'This client is out of date. Please refresh the page.'
				break
			}
			case TLIncompatibilityReason.ServerTooOld: {
				message =
					'The multiplayer server is out of date. Please reload the page. If the problem persists contact the system administrator.'
				break
			}
			case TLIncompatibilityReason.InvalidRecord: {
				message =
					'Your changes were rejected by the server. Please reload the page. If the problem persists contact the system administrator.'
				break
			}
			case TLIncompatibilityReason.InvalidOperation: {
				message =
					'Your changes were rejected by the server. Please reload the page. If the problem persists contact the system administrator.'
				break
			}
			default:
				exhaustiveSwitchError(error.reason)
		}
	}

	return (
		<div className="tldraw__editor tl-container">
			<ErrorScreen>{message}</ErrorScreen>
		</div>
	)
}
