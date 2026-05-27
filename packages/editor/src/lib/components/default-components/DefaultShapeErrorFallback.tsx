import { ComponentType } from 'react'

/** @public */
export type TLShapeErrorFallbackComponent = ComponentType<{ error: any }>

/** @internal */
export function DefaultShapeErrorFallback() {
	return <div className="tl-shape-error-boundary" />
}
