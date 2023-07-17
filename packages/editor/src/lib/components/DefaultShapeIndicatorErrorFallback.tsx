import { ComponentType } from 'react'

/** @public */
export type TLShapeIndicatorErrorFallbackComponent = ComponentType<{ error: unknown }>

/** @internal */
export const DefaultShapeIndicatorErrorFallback: TLShapeIndicatorErrorFallbackComponent = () => {
	return <circle cx={4} cy={4} r={8} strokeWidth="1" stroke="red" />
}
