import { useDroppable } from '@dnd-kit/core'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import styles from '../sidebar.module.css'

export function TlaSidebarDropZone({
	children,
	id,
	className,
	disabled = false,
}: {
	children: ReactNode
	id: string
	className?: string
	disabled?: boolean
}) {
	const app = useApp()

	// EDGE CASE: Prevent dropping files back into their origin drop zone
	// This avoids confusing "no-op" drops where dragging a file and dropping it
	// in the same place it started would do nothing
	const dragState = useValue(
		'dragState',
		() => {
			const state = app.sidebarState.get().dragState
			return state?.type === 'file' ? state : null
		},
		[app]
	)
	const isOriginDropZone = dragState?.originDropZoneId === id

	// EDGE CASE: Combine explicit disable flag with origin detection
	const isDisabled = disabled || isOriginDropZone

	const { isOver, setNodeRef } = useDroppable({
		id,
		disabled: isDisabled,
		resizeObserverConfig: {
			// specifying an empty array here means that all drop zones will be re-measured when this one resizes
			updateMeasurementsFor: [],
		},
	})

	// EDGE CASE: Only show file drop zone styling when dragging files (not groups)
	// Group drags use our custom cursor system, file drags use DndKit's drop zone styling
	const shouldShowFileDropZone = dragState !== null

	return (
		<div
			data-dnd-kit-droppable-id={id}
			ref={setNodeRef}
			className={classNames(
				styles.sidebarDropZone,
				{
					[styles.sidebarDropZoneActive]: isOver && !isDisabled && shouldShowFileDropZone,
				},
				className
			)}
		>
			{children}
		</div>
	)
}
