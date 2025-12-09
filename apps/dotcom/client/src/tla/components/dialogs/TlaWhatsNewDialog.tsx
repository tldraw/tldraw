import { useEffect, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import styles from './TlaWhatsNewDialog.module.css'

type WhatsNewVersion =
	| {
			version: string
			title: string
			date: Date
			/** Bulleted list of items */
			items: string[]
	  }
	| {
			version: string
			title: string
			date: Date
			/** Plain text description (use for longer explanations) */
			description: string
	  }

/**
 * What's new dialog content.
 *
 * HOW IT WORKS:
 * - We store the user's last seen version in local storage
 * - Blue notification dots appear when current version > seen version
 * - Dots disappear after user opens the dialog
 *
 * TO ADD NEW CONTENT:
 * 1. Bump the version in WHATS_NEW_CURRENT_VERSION (local-session-state.ts)
 * 2. Add a new version object at the top of this array
 * 3. Deploy - users will see the notification dots
 *
 * CONTENT FORMAT:
 * - Use `items` for bulleted lists of features/changes
 * - Use `description` for longer explanations or announcements
 * - Don't use both - pick the one that fits your content
 *
 * NOTES:
 * - Only MAX_DISPLAYED_VERSIONS most recent versions are displayed
 * - Versions are displayed newest first (index 0 = most recent)
 * - Users can navigate through displayed versions
 * - Version strings are arbitrary but should be sequential (e.g., "1.0", "1.1", "2.0")
 */
const VERSIONS: WhatsNewVersion[] = [
	{
		version: '1.0',
		title: 'Fairies and collaboration',
		date: new Date(2025, 11),
		items: [
			'Introduced Fairies - AI assistants that work with you on the canvas',
			'New grouping controls for better organization',
			'Comments and collaboration improvements',
		],
	},
	{
		version: '0.9',
		title: 'Important announcement',
		date: new Date(2025, 10),
		description:
			'This is an example of using the description format instead of bullet points. Use this format when you need to communicate longer explanations, important announcements, or messages that work better as a paragraph rather than a list of items.',
	},
	{
		version: '0.8',
		title: 'Enhanced tools',
		date: new Date(2025, 9),
		items: [
			'Enhanced shape manipulation tools',
			'Improved export formats',
			'Better mobile experience',
		],
	},
	{
		version: '0.7',
		title: 'Collaboration and theming',
		date: new Date(2025, 8),
		items: [
			'Real-time collaboration enhancements',
			'New theming system',
			'Performance optimizations',
		],
	},
	{
		version: '0.6',
		title: 'Drawing improvements',
		date: new Date(2025, 7),
		items: ['Advanced drawing tools', 'Keyboard shortcuts update', 'Accessibility improvements'],
	},
	{
		version: '0.5',
		title: 'Polish and refinement',
		date: new Date(2025, 6),
		items: ['New color picker', 'Grid and snap improvements', 'Bug fixes and stability'],
	},
]

const MAX_DISPLAYED_VERSIONS = 5

export function TlaWhatsNewDialog() {
	const [currentIndex, setCurrentIndex] = useState(0)
	const displayVersions = VERSIONS.slice(0, MAX_DISPLAYED_VERSIONS)
	const currentVersion = displayVersions[currentIndex]

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'ArrowLeft') {
				setCurrentIndex((i) => Math.max(0, i - 1))
			} else if (e.key === 'ArrowRight') {
				setCurrentIndex((i) => Math.min(displayVersions.length - 1, i + 1))
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [displayVersions.length])

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
						{currentVersion.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
					</span>
				</div>
				{'items' in currentVersion ? (
					<ul className={styles.list}>
						{currentVersion.items.map((item, i) => (
							<li key={i} className={styles.item}>
								{item}
							</li>
						))}
					</ul>
				) : (
					<div className={styles.description}>{currentVersion.description}</div>
				)}
				{displayVersions.length > 1 && (
					<div className={styles.navigation}>
						<TldrawUiButton
							type="icon"
							onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
							disabled={currentIndex === 0}
						>
							<TldrawUiButtonIcon icon="chevron-left" />
						</TldrawUiButton>
						<div className={styles.dots}>
							{displayVersions.map((_, i) => (
								<button
									key={i}
									className={i === currentIndex ? styles.dotActive : styles.dot}
									onClick={() => setCurrentIndex(i)}
									aria-label={`View version ${i + 1}`}
								/>
							))}
						</div>
						<TldrawUiButton
							type="icon"
							onClick={() => setCurrentIndex((i) => Math.min(displayVersions.length - 1, i + 1))}
							disabled={currentIndex === displayVersions.length - 1}
						>
							<TldrawUiButtonIcon icon="chevron-right" />
						</TldrawUiButton>
					</div>
				)}
			</TldrawUiDialogBody>
		</>
	)
}
