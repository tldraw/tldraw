import classNames from 'classnames'
import { useCallback, useEffect, useRef } from 'react'
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

	useEffect(() => {
		// if clicking away from the input, close the rename and save
		function handleClick(e: MouseEvent) {
			const target = e.target as HTMLElement
			if (!target.closest(`.${styles.renameWrapper}`)) {
				handleSave()
			}
		}

		// We wait a tick because we don't want to immediately close the input.
		setTimeout(() => {
			document.addEventListener('click', handleClick, { capture: true })
		}, 0)

		return () => {
			document.removeEventListener('click', handleClick, { capture: true })
		}
	}, [handleSave, onClose])

	return (
		<div className={styles.renameWrapper}>
			<TldrawUiInput
				ref={ref}
				className={classNames(styles.rename, 'tla-text_ui__regular')}
				defaultValue={app.getFileName(fileId)}
				onComplete={handleSave}
				onCancel={onClose}
				autoSelect
				autoFocus
			/>
		</div>
	)
}
