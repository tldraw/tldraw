import { ReactNode } from 'react'
import { TlaCloseButton } from './TlaCloseButton'

export function TlaWrapperCentered({
	onClose,
	children,
}: {
	onClose?(): void
	children: ReactNode
}) {
	return (
		<div className="tla-full">
			{onClose ? <TlaCloseButton onClose={onClose} /> : null}
			<div className="tla-full_inner">
				<div className="tla-full_content">{children}</div>
			</div>
		</div>
	)
}
