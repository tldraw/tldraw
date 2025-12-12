import { useCallback, useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { useWhatsNew } from '../../hooks/useWhatsNew'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import styles from './TlaWhatsNewDialog.module.css'

export function TlaWhatsNewDialog() {
	const { entries, isLoaded } = useWhatsNew()
	const trackEvent = useTldrawAppUiEvents()
	const [currentIndex, setCurrentIndex] = useState(0)

	const currentVersion = entries[currentIndex]

	const navigateToVersion = useCallback(
		(index: number) => {
			setCurrentIndex(index)
			const version = entries[index]
			if (version) {
				trackEvent('view-whats-new-version', {
					source: 'whats-new-dialog',
					version: version.version,
				})
			}
		},
		[entries, trackEvent]
	)

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'ArrowLeft' && currentIndex > 0) {
				navigateToVersion(currentIndex - 1)
			} else if (e.key === 'ArrowRight' && currentIndex < entries.length - 1) {
				navigateToVersion(currentIndex + 1)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [entries.length, currentIndex, navigateToVersion])

	if (!currentVersion) {
		return (
			<>
				<TldrawUiDialogHeader>
					<TldrawUiDialogTitle>
						<span />
					</TldrawUiDialogTitle>
					<TldrawUiDialogCloseButton />
				</TldrawUiDialogHeader>
				<TldrawUiDialogBody className={styles.dialogBody}>
					<div>No updates available</div>
				</TldrawUiDialogBody>
			</>
		)
	}

	const date = new Date(currentVersion.date)

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<div className={styles.title}>
					{currentVersion.title}
					<span className={styles.date}>
						{date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
					</span>
				</div>
				<div className={styles.description}>
					<Markdown>{currentVersion.description}</Markdown>
				</div>
				{entries.length > 1 && (
					<div className={styles.navigation}>
						<TldrawUiButton
							type="icon"
							onClick={() => navigateToVersion(currentIndex - 1)}
							disabled={currentIndex === 0}
						>
							<TldrawUiButtonIcon icon="chevron-left" />
						</TldrawUiButton>
						<div className={styles.dots}>
							{entries.map((_, i) => (
								<button
									key={i}
									className={i === currentIndex ? styles.dotActive : styles.dot}
									onClick={() => navigateToVersion(i)}
									aria-label={`View version ${i + 1}`}
								/>
							))}
						</div>
						<TldrawUiButton
							type="icon"
							onClick={() => navigateToVersion(currentIndex + 1)}
							disabled={currentIndex === entries.length - 1}
						>
							<TldrawUiButtonIcon icon="chevron-right" />
						</TldrawUiButton>
					</div>
				)}
			</TldrawUiDialogBody>
		</>
	)
}
