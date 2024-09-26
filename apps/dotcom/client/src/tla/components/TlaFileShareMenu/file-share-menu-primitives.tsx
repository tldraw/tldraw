import classNames from 'classnames'
import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import { TlaIcon } from '../TlaIcon'
import styles from './file-share-menu.module.css'

export const tlaFileShareMenuHelpContext = createContext<boolean>(false)

// Used to section areas of the menu, ie share links vs snapshots
export function TlaShareMenuSection({ children }: { children: ReactNode }) {
	return <div className={styles.section}>{children}</div>
}

// Used to group together adjacent controls, ie switches or selects
export function TlaShareMenuControlGroup({ children }: { children: ReactNode }) {
	return <div className={styles.controlGroup}>{children}</div>
}

// A row for a single control, usually label + input
export function TlaShareMenuControl({ children }: { children: ReactNode }) {
	return <div className={styles.control}>{children}</div>
}

// A label for a control
export function TlaShareMenuControlLabel({ children }: { children: ReactNode }) {
	return <div className="tla-text_ui__medium">{children}</div>
}

// A help item is displayed only when the user has toggled the menu's help mode
export function TlaShareMenuHelpItem({ children }: { children: ReactNode }) {
	const showingHelp = useContext(tlaFileShareMenuHelpContext)

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
	type?: string
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
		<button
			className={classNames('tla-button', `tla-button__${type}`, 'tla-text_ui__medium')}
			onClick={handleCopyLinkClick}
		>
			<span>{children}</span>
			<TlaIcon className={styles.copyButtonIcon} icon={copied ? 'check' : 'copy'} />
		</button>
	)
}
