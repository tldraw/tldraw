import { useCallback } from 'react'
import { SidebarFileContext } from '../../../app/TldrawApp'
import { useApp } from '../../../hooks/useAppState'
import { useIsFilePinned } from '../../../hooks/useIsFilePinned'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { TlaSidebarInlineInput } from './TlaSidebarInlineInput'

export function TlaSidebarRenameInline({
	fileId,
	onClose,
	source,
	context,
}: {
	fileId: string
	onClose(): void
	source: TLAppUiEventSource
	context: SidebarFileContext
}) {
	const app = useApp()
	const trackEvent = useTldrawAppUiEvents()
	const isPinned = useIsFilePinned(fileId)

	// Calculate left padding based on context
	const leftPadding = (() => {
		let padding = 0
		// Add 18px for pinned files
		if (isPinned) {
			padding += 15
		}
		// Add 6px for files in groups
		if (context === 'group-files') {
			padding += 8
		}
		return padding
	})()

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
			leftPadding={leftPadding}
		/>
	)
}
