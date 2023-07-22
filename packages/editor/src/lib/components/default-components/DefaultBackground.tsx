import { ComponentType } from 'react'

/** @public */
export type TLBackgroundComponent = ComponentType

export function DefaultBackground() {
	return <div className="tl-background" />
}
