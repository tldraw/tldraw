import { ReactNode } from 'react'

/** @public */
export interface TLHandlesProps {
	children: ReactNode
}

/** @public */
export const DefaultHandles = ({ children }: TLHandlesProps) => {
	return <svg className="tl-user-handles tl-overlays__item">{children}</svg>
}
