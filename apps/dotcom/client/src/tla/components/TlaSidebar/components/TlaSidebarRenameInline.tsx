import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { TldrawUiInput } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import styles from '../sidebar.module.css'

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
	const ref = useRef<HTMLInputElement>(null)
	const trackEvent = useTldrawAppUiEvents()

	const handleSave = useCallback(() => {
		// rename the file
		const elm = ref.current
		if (!elm) return
		const name = elm.value.slice(0, 312).trim()

		if (name) {
			// Only update the name if there is a name there to update
			app.updateFile({ id: fileId, name })
		}
		trackEvent('rename-file', { name, source })
		onClose()
	}, [app, fileId, onClose, trackEvent, source])

	return (
		<div className={styles.renameWrapper}>
			<TldrawUiInput
				ref={ref}
				className={classNames(styles.rename, 'tla-text_ui__regular')}
				defaultValue={app.getFileName(fileId)}
				onComplete={handleSave}
				onCancel={onClose}
				onBlur={handleSave}
				autoSelect
				autoFocus
			/>
		</div>
	)
}
