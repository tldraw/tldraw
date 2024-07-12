import { ReactNode } from 'react'
import { TlaCloseButton } from './TlaCloseButton'

export function TlaWrapperFullPage({
	onClose,
	children,
}: {
	onClose?: () => void
	children: ReactNode
}) {
	return (
		<div className="tla_full">
			{onClose ? <TlaCloseButton onClose={onClose} /> : null}
			<div className="tla_full_inner">
				<div className="tla_full_content">{children}</div>
			</div>
		</div>
	)
}
