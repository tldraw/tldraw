import { defineMessages } from '@tldraw/editor'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiTooltip } from '../primitives/TldrawUiTooltip'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	statusOffline: { id: 'status.offline', defaultMessage: 'Offline' },
})

/** @public @react */
export function OfflineIndicator() {
	const msg = useTranslation()

	return (
		<TldrawUiTooltip content={msg(messages.statusOffline.id)}>
			<div className="tlui-offline-indicator">
				<TldrawUiIcon icon="status-offline" label={msg(messages.statusOffline.id)} small />
			</div>
		</TldrawUiTooltip>
	)
}
