import { ReactNode } from 'react'
import { TlaCloseButton } from './TlaCloseButton'

export function TlaFullWrapper({
	onClose,
	children,
}: {
	onClose: () => void
	children: ReactNode
}) {
	return (
		<div className="tla_full">
			<TlaCloseButton onClose={onClose} />
			<div className="tla_full_inner">
				<div className="tla_full_content">{children}</div>
			</div>
		</div>
	)
}
