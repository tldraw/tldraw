import { ComponentType } from 'react'

/** @public */
export type TLBackgroundComponent = ComponentType

/** @public */
export function DefaultBackground() {
	return <div className="tl-background" />
}
