import { TldrawUiIcon } from '@tldraw/ui'
import { TldrawUiTooltip } from '@tldraw/ui'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

/** @public @react */
export function OfflineIndicator() {
	const msg = useTranslation()

	return (
		<TldrawUiTooltip content={msg('status.offline')}>
			<div className="tlui-offline-indicator">
				<TldrawUiIcon icon="status-offline" label={msg('status.offline')} small />
			</div>
		</TldrawUiTooltip>
	)
}
