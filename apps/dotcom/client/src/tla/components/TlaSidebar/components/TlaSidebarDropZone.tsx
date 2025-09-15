import classNames from 'classnames'
import { ReactNode } from 'react'

export function TlaSidebarDropZone({
	children,
	id: _id,
	className,
	disabled: _disabled = false,
}: {
	children: ReactNode
	id: string
	className?: string
	disabled?: boolean
}) {
	return <div className={classNames(className)}>{children}</div>
}
