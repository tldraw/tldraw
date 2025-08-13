import { DragOverlay } from '@dnd-kit/core'
import classNames from 'classnames'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import styles from '../sidebar.module.css'

export function TlaSidebarDragOverlay() {
	const app = useApp()

	const dragState = useValue('dragState', () => app.sidebarState.get().dragState, [app])

	const fileName = useValue(
		'file name',
		() => (dragState ? app.getFileName(dragState.fileId) : null),
		[dragState?.fileId, app]
	)

	if (!dragState || !fileName) return null

	return (
		<DragOverlay dropAnimation={null}>
			<div
				data-dnd-kit-draggable-id={`${dragState.fileId}:${dragState.context}`}
				className={classNames(styles.sidebarFileListItem, styles.hoverable)}
			>
				<div className={styles.sidebarFileListItemContent}>
					<div
						className={classNames(
							styles.sidebarFileListItemLabel,
							'tla-text_ui__regular',
							'notranslate'
						)}
					>
						{fileName}
					</div>
				</div>
			</div>
		</DragOverlay>
	)
}
