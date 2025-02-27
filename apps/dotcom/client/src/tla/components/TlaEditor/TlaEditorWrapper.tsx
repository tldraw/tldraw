import { ReactNode } from 'react'
import styles from './editor.module.css'

export function TlaEditorWrapper({ children }: { children: ReactNode }) {
	return (
		<div className={styles.editor} data-testid="tla-editor">
			{children}
		</div>
	)
}
