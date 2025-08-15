import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import styles from '../sidebar.module.css'

export function ReorderCursor({
	dragStateSelector,
}: {
	dragStateSelector(app: ReturnType<typeof useApp>): number | null | undefined
}) {
	const app = useApp()
	const position = useValue('reorder cursor position', () => dragStateSelector(app), [app])
	if (position == null) return null

	return (
		<div
			className={styles.dropCursorLine}
			style={{
				position: 'fixed',
				top: position,
				transform: 'translateY(-50%)',
				left: 8,
				width: 'calc(100% - 16px)',
				zIndex: 1000,
				pointerEvents: 'none',
			}}
		/>
	)
}
