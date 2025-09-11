import { useCallback } from 'react'
import { useApp } from '../../../hooks/useAppState'
import { useIsFilePinned } from '../../../hooks/useIsFilePinned'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { TlaSidebarInlineInput } from './TlaSidebarInlineInput'

export function TlaSidebarRenameInline({
	fileId,
	onClose,
	source,
}: {
	fileId: string
	onClose(): void
	source: TLAppUiEventSource
}) {
	const app = useApp()
	const trackEvent = useTldrawAppUiEvents()
	const isPinned = useIsFilePinned(fileId)

	const handleComplete = useCallback(
		(name: string) => {
			// Only update the name if there is a name there to update
			app.updateFile(fileId, { name })
			trackEvent('rename-file', { name, source })
			onClose()
		},
		[app, fileId, onClose, trackEvent, source]
	)

	return (
		<TlaSidebarInlineInput
			data-testid="tla-sidebar-rename-input"
			defaultValue={app.getFileName(fileId)}
			onComplete={handleComplete}
			onCancel={onClose}
			isPinned={isPinned}
		/>
	)
}
