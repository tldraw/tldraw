import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'

/** @public @react */
export function OfflineIndicator() {
	const msg = useTranslation()

	return (
		<button className="tlui-offline-indicator" title={msg('status.offline')}>
			<TldrawUiIcon icon="status-offline" label={msg('status.offline')} />
		</button>
	)
}
