import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiTooltip } from '../primitives/TldrawUiTooltip'

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
