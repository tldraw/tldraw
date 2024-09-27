import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './file-share-menu.module.css'

export const tlaFileShareMenuHelpContext = createContext(
	{} as { showingHelp: boolean; onChange(): void }
)

export function TlaFileShareMenuHelpProvider({ children }: { children: ReactNode }) {
	const [showingHelp, setShowingHelp] = useState(false)

	const onChange = useCallback(() => {
		setShowingHelp((v) => !v)
	}, [])

	return (
		<tlaFileShareMenuHelpContext.Provider value={{ showingHelp, onChange }}>
			{children}
		</tlaFileShareMenuHelpContext.Provider>
	)
}

export function TlaFileShareMenuHelpToggle() {
	const { showingHelp, onChange } = useContext(tlaFileShareMenuHelpContext)

	return (
		<button className={styles.helpButton} onClick={onChange} data-active={showingHelp}>
			<TlaIcon icon="question-circle" />
		</button>
	)
}

// A help item is displayed only when the user has toggled the menu's help mode
export function TlaShareMenuHelpItem({ children }: { children: ReactNode }) {
	const { showingHelp } = useContext(tlaFileShareMenuHelpContext)

	if (!showingHelp) return null

	return <div className={styles.helpItem}>{children}</div>
}

// A button that copies something to the clipboard
export function TlaShareMenuCopyButton({
	children,
	type = 'primary',
	onClick,
}: {
	children: ReactNode
	onClick(): void
	type?: 'primary' | 'secondary' | 'warning'
}) {
	const [copied, setCopied] = useState(false)

	const handleCopyLinkClick = useCallback(() => {
		if (copied) return
		onClick()
		setCopied(true)
		setTimeout(() => setCopied(false), 2500)
		return () => setCopied(false)
	}, [copied, onClick])

	return (
		<TlaButton variant={type} onClick={handleCopyLinkClick} iconRight={copied ? 'check' : 'copy'}>
			{children}
		</TlaButton>
	)
}
