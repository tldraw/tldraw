import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import styles from '../sidebar.module.css'

export function ReorderCursor() {
	const app = useApp()
	const position = useValue(
		'reorder cursor position',
		() => {
			const dragState = app.sidebarState.get().dragState
			return dragState?.operation?.reorder?.indicatorY ?? null
		},
		[app]
	)
	if (position == null) return null

	return <div className={styles.dropCursorLine} style={{ top: Math.round(position) }} />
}
