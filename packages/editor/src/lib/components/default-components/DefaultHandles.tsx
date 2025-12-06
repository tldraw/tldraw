import { ReactNode } from 'react'

/** @public */
export interface TLHandlesProps {
	children: ReactNode
}

/** @public @react */
export const DefaultHandles = ({ children }: TLHandlesProps) => {
	return (
		<svg className="tl-user-handles tl-overlays__item" aria-hidden="true">
			{children}
		</svg>
	)
}
