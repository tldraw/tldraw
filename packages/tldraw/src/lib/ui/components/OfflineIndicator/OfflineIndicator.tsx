import { TlIcon } from '@tldraw/ui'
import { TlTooltip } from '@tldraw/ui'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

/** @public @react */
export function OfflineIndicator() {
	const msg = useTranslation()

	return (
		<TlTooltip content={msg('status.offline')}>
			<div className="tlui-offline-indicator">
				<TlIcon icon="status-offline" label={msg('status.offline')} small />
			</div>
		</TlTooltip>
	)
}
