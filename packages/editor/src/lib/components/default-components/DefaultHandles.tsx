import { ComponentType } from 'react'

/** @public */
export type TLHandlesComponent = ComponentType<{
	className?: string
	children: any
}>

export const DefaultHandles: TLHandlesComponent = ({ children }) => {
	return <svg className="tl-user-handles tl-overlays__item">{children}</svg>
}
