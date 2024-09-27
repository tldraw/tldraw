import { ReactNode } from 'react'
import styles from './menu.module.css'

// Used to section areas of the menu, ie links vs snapshots
export function TlaMenuSection({ children }: { children: ReactNode }) {
	return <div className={styles.section}>{children}</div>
}

// Used to group together adjacent controls, ie switches or selects
export function TlaMenuControlGroup({ children }: { children: ReactNode }) {
	return <div className={styles.controlGroup}>{children}</div>
}

// A row for a single control, usually label + input
export function TlaMenuControl({ children }: { children: ReactNode }) {
	return <div className={styles.control}>{children}</div>
}

// A label for a control
export function TlaMenuControlLabel({ children }: { children: ReactNode }) {
	return <div className="tla-text_ui__medium">{children}</div>
}
