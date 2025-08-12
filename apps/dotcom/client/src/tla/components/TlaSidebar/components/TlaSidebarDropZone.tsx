import { useDroppable } from '@dnd-kit/core'
import classNames from 'classnames'
import { ReactNode } from 'react'
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
	const { isOver, setNodeRef } = useDroppable({
		id,
		disabled,
		resizeObserverConfig: {
			// specifying an empty array here means that all drop zones will be re-measured when this one resizes
			updateMeasurementsFor: [],
		},
	})

	return (
		<div
			ref={setNodeRef}
			className={classNames(
				styles.sidebarDropZone,
				{
					[styles.sidebarDropZoneActive]: isOver && !disabled,
				},
				className
			)}
		>
			{children}
		</div>
	)
}
