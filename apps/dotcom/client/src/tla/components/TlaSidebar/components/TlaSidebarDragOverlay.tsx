import { DragOverlay } from '@dnd-kit/core'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import styles from '../sidebar.module.css'

export function TlaSidebarDragOverlay() {
	const app = useApp()

	const dragState = useValue(
		'dragState',
		() => {
			const state = app.sidebarState.get().dragState
			if (state && state?.type !== 'group') {
				const file = app.getFile(state.fileId)
				if (!file) return null
				return file.name
			}
			return null
		},
		[app]
	)

	if (!dragState) return null

	return (
		<DragOverlay>
			<div className={styles.sidebarFileListItemDragOverlay}>{dragState}</div>
		</DragOverlay>
	)
}
