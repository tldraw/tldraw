import { DragOverlay } from '@dnd-kit/core'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { TlaIcon } from '../../TlaIcon/TlaIcon'

export function TlaSidebarDragOverlay() {
	const app = useApp()

	const dragState = useValue(
		'dragState',
		() => {
			const state = app.sidebarState.get().dragState
			return state?.type === 'file' ? state : null
		},
		[app]
	)

	if (!dragState) return null
	return null

	return (
		<DragOverlay
			dropAnimation={null}
			adjustScale={false}
			style={{
				cursor: 'grabbing',
			}}
		>
			<div
				style={{
					width: 32,
					height: 32,
					backgroundColor: 'var(--tla-color-panel)',
					border: '1px solid var(--tla-color-divider)',
					borderRadius: '8px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
					opacity: 0.9,
					transform: 'translate(-50%, -50%)',
				}}
			>
				<TlaIcon icon="document" />
			</div>
		</DragOverlay>
	)
}
