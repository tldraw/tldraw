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

	// Check if this drop zone is the origin drop zone (where the drag started)
	const dragState = useValue('dragState', () => app.sidebarState.get().dragState, [app])
	const isOriginDropZone = dragState?.originDropZoneId === id

	// Disable this drop zone if it's the origin drop zone or if it's explicitly disabled
	const isDisabled = disabled || isOriginDropZone

	const { isOver, setNodeRef } = useDroppable({
		id,
		disabled: isDisabled,
		resizeObserverConfig: {
			// specifying an empty array here means that all drop zones will be re-measured when this one resizes
			updateMeasurementsFor: [],
		},
	})

	return (
		<div
			data-dnd-kit-droppable-id={id}
			ref={setNodeRef}
			className={classNames(
				styles.sidebarDropZone,
				{
					[styles.sidebarDropZoneActive]: isOver && !isDisabled,
				},
				className
			)}
		>
			{children}
		</div>
	)
}
