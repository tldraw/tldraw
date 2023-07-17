import { ComponentType } from 'react'

/** @public */
export type TLBackgroundComponent = ComponentType<object> | null

export function DefaultBackground() {
	return <div className="tl-background" />
}
